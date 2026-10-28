import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { AuditService } from '../common/audit.service';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { dateFieldWhere, optionalEquals } from '../common/query/date-range.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { UpdateBomItemDto } from './dto/update-bom-item.dto';

const BOM_ITEM_SORT_FIELDS = ['createdAt', 'quantity'] as const;

@Injectable()
export class BomItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      relations: [
        { table: 'Product', columns: ['name'], foreignKey: 'productId' },
        { table: 'Component', columns: ['name'], foreignKey: 'componentId' },
      ],
    });
    const where: Prisma.BomItemWhereInput = {
      ...optionalEquals('productId', query.productId),
      ...optionalEquals('componentId', query.componentId),
      ...dateFieldWhere('createdAt', query.dateFrom, query.dateTo),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.bomItem.findMany({
          where,
          include: {
            product: true,
            variant: true,
            component: true,
            color: true,
          },
          orderBy: resolveOrderBy(query, BOM_ITEM_SORT_FIELDS, 'createdAt'),
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.bomItem.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.bomItem.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
        component: true,
        color: true,
      },
    });
  }

  async create(dto: CreateBomItemDto, userId?: string) {
    const created = await this.prisma.bomItem.create({
      data: {
        productId: dto.productId,
        variantId: dto.variantId,
        componentId: dto.componentId,
        colorId: dto.colorId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
      },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Product',
        entityId: created.productId,
        action: 'PRODUCT_UPDATED',
        userId,
        changes: {
          bomQuantity: { after: Number(created.quantity) },
          componentId: { after: created.componentId },
        },
        details: 'Ligne de nomenclature ajoutée',
      });
    }

    return created;
  }

  async update(id: string, dto: UpdateBomItemDto, userId?: string) {
    const before = await this.prisma.bomItem.findUnique({
      where: { id },
      select: { productId: true, quantity: true, componentId: true },
    });
    if (!before) {
      throw new NotFoundException('Ligne de nomenclature introuvable');
    }

    const updated = await this.prisma.bomItem.update({
      where: { id },
      data: {
        ...(dto.productId !== undefined ? { productId: dto.productId } : {}),
        ...(dto.variantId !== undefined ? { variantId: dto.variantId } : {}),
        ...(dto.componentId !== undefined ? { componentId: dto.componentId } : {}),
        ...(dto.colorId !== undefined ? { colorId: dto.colorId } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
        ...(dto.unitCost !== undefined ? { unitCost: dto.unitCost } : {}),
      },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Product',
        entityId: updated.productId,
        action: 'PRODUCT_UPDATED',
        userId,
        changes: {
          bomQuantity: {
            before: Number(before.quantity),
            after: Number(updated.quantity),
          },
          componentId: {
            before: before.componentId,
            after: updated.componentId,
          },
        },
        details: 'Ligne de nomenclature mise à jour',
      });
    }

    return updated;
  }

  async remove(id: string, userId?: string) {
    const existing = await this.prisma.bomItem.findUnique({
      where: { id },
      select: { productId: true, quantity: true, componentId: true },
    });
    if (!existing) {
      throw new NotFoundException('Ligne de nomenclature introuvable');
    }

    await this.prisma.bomItem.delete({ where: { id } });

    if (userId) {
      await this.auditService.log({
        entityType: 'Product',
        entityId: existing.productId,
        action: 'PRODUCT_UPDATED',
        userId,
        changes: {
          bomQuantity: { before: Number(existing.quantity), after: null },
          componentId: { before: existing.componentId, after: null },
        },
        details: 'Ligne de nomenclature supprimée',
      });
    }
  }
}
