import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { ListQueryDto } from '../common/dto/list-query.dto';
import {
  compressBufferIfNeeded,
  decompressBufferIfNeeded,
} from '../ged/compression.util';
import { DEFAULT_GED_BUCKET_RAW } from '../ged/ged.constants';
import { GedPathsService } from '../ged/ged-paths.service';
import { MinioService } from '../ged/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpsertProductTechnicalSheetDto } from './dto/upsert-product-technical-sheet.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly gedPathsService: GedPathsService,
  ) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.q
        ? {
            OR: [
              { ref: { contains: query.q } },
              { name: { contains: query.q } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.product.findMany({
          where,
          include: { category: true, variants: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.product.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.product
      .findUnique({
        where: { id },
        include: {
          category: true,
          variants: true,
          bomItems: true,
          productImages: { orderBy: { createdAt: 'desc' } },
        },
      })
      .then((product) => {
        if (!product) return product;
        return {
          ...product,
          productImages: product.productImages.map((image) => ({
            ...image,
            version: this.extractVersion(image.objectKey ?? image.storagePath),
            decompressedUrl: `/products/${id}/images/${image.id}`,
          })),
        };
      });
  }

  async listImages(productId: string) {
    await this.ensureProductExists(productId);
    return this.prisma.productImage
      .findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
      })
      .then((items) =>
        items.map((item) => ({
          ...item,
          version: this.extractVersion(item.objectKey ?? item.storagePath),
        })),
      );
  }

  async getTechnicalSheet(productId: string) {
    await this.ensureProductExists(productId);

    const sheet = await this.prisma.productTechnicalSheet.findUnique({
      where: { productId },
      include: {
        elements: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (sheet) {
      return sheet;
    }

    return {
      productId,
      version: 0,
      title: null,
      instructions: null,
      workshopNotes: null,
      elements: [],
      isDraft: true,
    };
  }

  async upsertTechnicalSheet(productId: string, dto: UpsertProductTechnicalSheetDto) {
    await this.ensureProductExists(productId);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productTechnicalSheet.findUnique({
        where: { productId },
        select: { id: true, version: true },
      });

      const nextVersion = existing ? existing.version + 1 : 1;

      const sheet = existing
        ? await tx.productTechnicalSheet.update({
            where: { productId },
            data: {
              title: dto.title,
              instructions: dto.instructions,
              workshopNotes: dto.workshopNotes,
              version: nextVersion,
            },
          })
        : await tx.productTechnicalSheet.create({
            data: {
              productId,
              title: dto.title,
              instructions: dto.instructions,
              workshopNotes: dto.workshopNotes,
              version: nextVersion,
            },
          });

      await tx.productTechnicalSheetElement.deleteMany({
        where: { technicalSheetId: sheet.id },
      });

      if (dto.elements.length > 0) {
        await tx.productTechnicalSheetElement.createMany({
          data: dto.elements.map((element) => ({
            technicalSheetId: sheet.id,
            sequence: element.sequence,
            name: element.name,
            category: element.category as any,
            componentType: element.componentType,
            material: element.material,
            color: element.color,
            dimensions: element.dimensions,
            sizeLabel: element.sizeLabel,
            quantity: element.quantity,
            unit: (element.unit ?? null) as any,
            isOptional: element.isOptional ?? false,
            notes: element.notes,
          })),
        });
      }

      return tx.productTechnicalSheet.findUnique({
        where: { id: sheet.id },
        include: {
          elements: {
            orderBy: { sequence: 'asc' },
          },
        },
      });
    });
  }

  async uploadImages(
    productId: string,
    files: Express.Multer.File[],
    userId?: string,
    options?: { version?: number; documentType?: string },
  ) {
    await this.ensureProductExists(productId);
    if (!files?.length) {
      throw new BadRequestException('Aucun fichier image reçu.');
    }

    const created = await Promise.all(
      files.map(async (file) => {
        const { buffer: storedBuffer, algo } = compressBufferIfNeeded(
          file.buffer,
          file.mimetype,
        );

        const objectKey = this.gedPathsService.buildObjectKey({
          domain: 'admin',
          entityType: 'product',
          entityId: productId,
          documentType: options?.documentType ?? 'image',
          originalFileName: file.originalname,
          version: options?.version,
        });

        let storagePath: string | null = null;
        let bucket: string | null = null;
        let persistedObjectKey: string | null = null;

        if (this.minioService.isEnabled()) {
          bucket = DEFAULT_GED_BUCKET_RAW;
          persistedObjectKey = objectKey;
          await this.minioService.putObject({
            bucket,
            key: objectKey,
            body: storedBuffer,
            contentType: file.mimetype,
            contentEncoding: algo === 'GZIP' ? 'gzip' : undefined,
          });
        } else {
          storagePath = join(process.cwd(), 'uploads', 'ged', objectKey);
          await mkdir(dirname(storagePath), { recursive: true });
          await writeFile(storagePath, storedBuffer);
        }

        return this.prisma.productImage.create({
          data: {
            productId,
            originalName: file.originalname,
            mimeType: file.mimetype,
            bucket,
            objectKey: persistedObjectKey,
            storagePath,
            originalSize: file.size,
            compressedSize: storedBuffer.length,
            compressionAlgo: algo,
            uploadedById: userId,
          } as any,
        });
      }),
    );

    return created;
  }

  async replaceImage(
    productId: string,
    imageId: string,
    file: Express.Multer.File,
    userId?: string,
  ) {
    const existing = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!existing) {
      throw new NotFoundException('Image produit introuvable');
    }
    if (!file) {
      throw new BadRequestException('Aucun fichier image reçu.');
    }

    const nextVersion =
      this.extractVersion(existing.objectKey ?? existing.storagePath) + 1;

    const [created] = await this.uploadImages(productId, [file], userId, {
      version: nextVersion,
      documentType: 'image',
    });

    return {
      replacedImageId: imageId,
      newImageId: created.id,
      version: nextVersion,
      image: created,
    };
  }

  async deleteImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image produit introuvable');
    }

    await this.removeStoredObject(image);
    await this.prisma.productImage.delete({ where: { id: imageId } });

    return { id: imageId, deleted: true };
  }

  async getImageBinary(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image produit introuvable');
    }

    let storedBuffer: Buffer;
    if (image.bucket && image.objectKey && this.minioService.isEnabled()) {
      storedBuffer = await this.minioService.getObjectAsBuffer({
        bucket: image.bucket,
        key: image.objectKey,
      });
    } else if (image.storagePath) {
      storedBuffer = await readFile(image.storagePath);
    } else {
      throw new NotFoundException('Fichier image indisponible');
    }

    const outputBuffer = decompressBufferIfNeeded(
      storedBuffer,
      image.compressionAlgo,
    );

    return {
      originalName: image.originalName,
      mimeType: image.mimeType,
      buffer: outputBuffer,
    };
  }

  create(dto: CreateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({
        where: { id: dto.categoryId },
        select: {
          id: true,
          code: true,
          slug: true,
          name: true,
          refSequenceLength: true,
          refNextSequence: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Categorie introuvable');
      }

      const nextRef = dto.ref?.trim()
        ? dto.ref.trim().toUpperCase()
        : await this.generateNextSequentialProductRef(tx as any, category);

      this.assertRefMatchesCategory(nextRef, category);

      return tx.product.create({
        data: {
          ref: nextRef,
          name: dto.name,
          description: dto.description,
          categoryId: dto.categoryId,
          basePrice: dto.basePrice,
          stockOnHand: dto.stockOnHand,
          status: dto.status as any,
          variants: dto.variants?.length
            ? {
                create: dto.variants.map((variant) => ({
                  sku: variant.sku,
                  colorId: variant.colorId,
                  size: (variant.size ?? 'MM') as any,
                  defaultDimensions: variant.defaultDimensions,
                  name: variant.name,
                  stockOnHand: variant.stockOnHand ?? 0,
                  priceOverride: variant.priceOverride,
                  active: variant.active ?? true,
                })),
              }
            : undefined,
        } as any,
      });
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: { id: true, categoryId: true, ref: true },
      });

      if (!existing) {
        throw new NotFoundException('Produit introuvable');
      }

      const targetCategoryId = dto.categoryId ?? existing.categoryId;
      const targetRef = dto.ref ?? existing.ref;

      const category = await tx.category.findUnique({
        where: { id: targetCategoryId },
        select: {
          id: true,
          code: true,
          slug: true,
          name: true,
          refSequenceLength: true,
          refNextSequence: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Categorie introuvable');
      }

      this.assertRefMatchesCategory(targetRef, category);

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.ref ? { ref: dto.ref.trim().toUpperCase() } : {}),
          variants: undefined,
        } as any,
      });

      if (dto.variants) {
        await tx.productVariant.deleteMany({ where: { productId: id } });

        if (dto.variants.length > 0) {
          await tx.productVariant.createMany({
            data: dto.variants.map((variant) => ({
              productId: id,
              sku: variant.sku,
              colorId: variant.colorId,
              size: (variant.size ?? 'MM') as any,
              defaultDimensions: variant.defaultDimensions,
              name: variant.name,
              stockOnHand: variant.stockOnHand ?? 0,
              priceOverride: variant.priceOverride as any,
              active: variant.active ?? true,
            })),
          });
        }
      }

      return updated;
    });
  }

  remove(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }

  private async ensureProductExists(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Produit introuvable');
    }
  }

  private extractVersion(pathLike?: string | null): number {
    if (!pathLike) return 1;
    const match = pathLike.match(/\/v(\d+)\//);
    return match ? Number(match[1]) : 1;
  }

  private async removeStoredObject(image: {
    bucket: string | null;
    objectKey: string | null;
    storagePath: string | null;
  }) {
    if (image.bucket && image.objectKey && this.minioService.isEnabled()) {
      await this.minioService.removeObject({
        bucket: image.bucket,
        key: image.objectKey,
      });
      return;
    }

    if (image.storagePath) {
      await unlink(image.storagePath).catch(() => undefined);
    }
  }

  private assertRefMatchesCategory(
    rawRef: string,
    category: {
      code: string | null;
      slug: string;
      name: string;
      refSequenceLength: number;
    },
  ) {
    const ref = rawRef.trim().toUpperCase();
    if (!ref) {
      throw new BadRequestException('La reference produit est obligatoire');
    }

    const categoryPrefix = this.getCategoryRefPrefix(category);
    if (!ref.startsWith(`${categoryPrefix}/`)) {
      throw new BadRequestException(
        `Reference invalide: le prefixe attendu est ${categoryPrefix}/ (ex: ${categoryPrefix}/123123)`,
      );
    }

    const suffix = ref.slice(categoryPrefix.length + 1);
    if (!suffix) {
      throw new BadRequestException(
        'Reference invalide: ajoute un identifiant apres le prefixe de categorie',
      );
    }

    const suffixRegex = this.getRefSuffixRegex(category.refSequenceLength);
    if (!suffixRegex.test(suffix)) {
      throw new BadRequestException(
        `Reference invalide: la partie apres ${categoryPrefix}/ doit contenir exactement ${category.refSequenceLength} chiffres`,
      );
    }
  }

  private getCategoryRefPrefix(category: {
    code: string | null;
    slug: string;
    name: string;
  }) {
    if (category.code?.trim()) {
      return category.code.trim().toUpperCase();
    }

    const base = (category.slug || category.name)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();

    return (base.slice(0, 3) || 'CAT').toUpperCase();
  }

  private async generateNextSequentialProductRef(
    tx: any,
    category: {
      id: string;
      code: string | null;
      slug: string;
      name: string;
      refSequenceLength: number;
      refNextSequence: number;
    },
  ) {
    const prefix = this.getCategoryRefPrefix(category);
    const length = this.normalizeRefSequenceLength(category.refSequenceLength);

    for (let i = 0; i < 50; i++) {
      const updatedCategory = await tx.category.update({
        where: { id: category.id },
        data: { refNextSequence: { increment: 1 } },
        select: { refNextSequence: true },
      });

      const sequenceNumber = updatedCategory.refNextSequence - 1;
      const suffix = sequenceNumber.toString().padStart(length, '0');
      if (suffix.length > length) {
        throw new BadRequestException(
          `Reference automatique impossible: la sequence depasse ${length} chiffres. Augmente refSequenceLength sur la categorie.`,
        );
      }

      const candidate = `${prefix}/${suffix}`;

      const existing = await tx.product.findUnique({
        where: { ref: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    throw new BadRequestException(
      'Impossible de generer une reference sequentielle unique. Veuillez reessayer.',
    );
  }

  private getRefSuffixRegex(length: number) {
    const normalizedLength = this.normalizeRefSequenceLength(length);
    return new RegExp(`^\\d{${normalizedLength}}$`);
  }

  private normalizeRefSequenceLength(length?: number) {
    if (!length || Number.isNaN(length)) {
      return 6;
    }
    return Math.min(12, Math.max(1, Math.trunc(length)));
  }

}
