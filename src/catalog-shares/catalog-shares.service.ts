import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../generated/prisma/client';
import { CatalogShareStatus } from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { dateFieldWhere, optionalEquals } from '../common/query/date-range.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { ProductsService } from '../products/products.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogShareDto } from './dto/create-catalog-share.dto';
import { ReplaceCatalogShareProductsDto } from './dto/replace-catalog-share-products.dto';
import { UpdateCatalogShareDto } from './dto/update-catalog-share.dto';

export type CatalogShareWithClientAndProducts = Prisma.CatalogShareGetPayload<{
  include: {
    client: true;
    products: {
      include: {
        product: true;
      };
    };
  };
}>;

export type CatalogShareWithPublicProducts = Prisma.CatalogShareGetPayload<{
  include: {
    client: true;
    products: {
      include: {
        product: {
          include: {
            category: true;
          };
        };
      };
    };
  };
}>;

const CATALOG_SHARE_SORT_FIELDS = ['createdAt', 'title', 'expiresAt', 'viewCount'] as const;

@Injectable()
export class CatalogSharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['title', 'token'],
      relations: [{ table: 'Client', columns: ['name'], foreignKey: 'clientId' }],
    });
    const where: Prisma.CatalogShareWhereInput = {
      ...enumWhere('status', query.status, CatalogShareStatus),
      ...optionalEquals('clientId', query.clientId),
      ...dateFieldWhere('createdAt', query.dateFrom, query.dateTo),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.catalogShare.findMany({
          where,
          include: {
            client: true,
            products: {
              include: { product: true },
            },
          },
          orderBy: resolveOrderBy(query, CATALOG_SHARE_SORT_FIELDS, 'createdAt'),
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.catalogShare.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string): Promise<CatalogShareWithClientAndProducts | null> {
    return this.prisma.catalogShare.findUnique({
      where: { id },
      include: {
        client: true,
        products: {
          include: { product: { include: { category: true } } },
        },
      },
    });
  }

  async create(dto: CreateCatalogShareDto) {
    const token = randomUUID();
    const productIds = [...new Set(dto.productIds ?? [])];
    await this.productsService.assertCompanyOwnedProductIds(productIds);

    return this.prisma.catalogShare.create({
      data: {
        token,
        title: dto.title,
        clientId: dto.clientId ?? null,
        status: dto.status ?? CatalogShareStatus.ACTIVE,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        maxViewCount: dto.maxViewCount ?? null,
        products: productIds.length
          ? {
              create: productIds.map((productId) => ({ productId })),
            }
          : undefined,
      },
      include: {
        client: true,
        products: { include: { product: true } },
      },
    });
  }

  update(id: string, dto: UpdateCatalogShareDto): Promise<CatalogShareWithClientAndProducts> {
    return this.prisma.catalogShare.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.clientId !== undefined ? { clientId: dto.clientId } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.maxViewCount !== undefined ? { maxViewCount: dto.maxViewCount } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        client: true,
        products: { include: { product: true } },
      },
    });
  }

  async replaceProducts(id: string, dto: ReplaceCatalogShareProductsDto) {
    const productIds = [...new Set(dto.productIds)];
    await this.productsService.assertCompanyOwnedProductIds(productIds);

    return this.prisma.$transaction(async (tx) => {
      const share = await tx.catalogShare.findUnique({ where: { id } });

      if (!share) {
        throw new NotFoundException('Catalog share not found.');
      }

      await tx.catalogShareProduct.deleteMany({
        where: { catalogShareId: id },
      });

      await tx.catalogShareProduct.createMany({
        data: productIds.map((productId) => ({
          catalogShareId: id,
          productId,
        })),
      });

      return tx.catalogShare.findUnique({
        where: { id },
        include: {
          client: true,
          products: { include: { product: true } },
        },
      });
    });
  }

  async removeProduct(id: string, productId: string) {
    await this.prisma.catalogShareProduct.deleteMany({
      where: { catalogShareId: id, productId },
    });

    return { message: 'Product removed from catalog share.' };
  }

  async remove(id: string): Promise<{ message: string }> {
    const share = await this.prisma.catalogShare.findUnique({ where: { id } });

    if (!share) {
      throw new NotFoundException('Catalog share not found.');
    }

    if (share.status === CatalogShareStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot delete an active catalog share. Revoke or expire it first.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.catalogShareProduct.deleteMany({
        where: { catalogShareId: id },
      });
      await tx.catalogShare.delete({ where: { id } });
    });

    return { message: 'Catalog share deleted.' };
  }

  async getPublicByToken(token: string): Promise<CatalogShareWithPublicProducts> {
    const share = await this.prisma.catalogShare.findUnique({
      where: { token },
      include: {
        client: true,
        products: {
          where: { product: { ownership: 'COMPANY' } },
          include: { product: { include: { category: true } } },
        },
      },
    });

    if (!share) {
      throw new NotFoundException('Catalog share not found.');
    }

    if (share.status !== CatalogShareStatus.ACTIVE) {
      throw new BadRequestException('Catalog share is not active.');
    }

    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Catalog share has expired.');
    }

    if (
      share.maxViewCount !== null &&
      share.viewCount >= share.maxViewCount
    ) {
      throw new BadRequestException(
        'Catalog share has reached its maximum number of views.',
      );
    }

    await this.prisma.catalogShare.update({
      where: { id: share.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    return share;
  }
}
