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
    return this.prisma.product.create({
      data: dto as any,
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto as any,
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
}
