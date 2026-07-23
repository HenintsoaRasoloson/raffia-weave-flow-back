import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { ComponentOrigin } from '../generated/prisma/client';
import { AuditService } from '../common/audit.service';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { dateFieldWhere, optionalEquals } from '../common/query/date-range.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

const COMPONENT_SORT_FIELDS = ['createdAt', 'name', 'ref', 'stockQty'] as const;

@Injectable()
export class ComponentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['ref', 'name'],
    });
    const where: Prisma.ComponentWhereInput = {
      ...enumWhere('origin', query.type, ComponentOrigin),
      ...optionalEquals('supplierId', query.supplierId),
      ...dateFieldWhere('createdAt', query.dateFrom, query.dateTo),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.component.findMany({
          where,
          include: { supplier: true },
          orderBy: resolveOrderBy(query, COMPONENT_SORT_FIELDS, 'createdAt'),
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.component.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.component.findUnique({
      where: { id },
      include: { supplier: true },
    });
  }

  async create(dto: CreateComponentDto, userId?: string) {
    const origin = dto.origin ?? ComponentOrigin.PURCHASED;
    if (origin === ComponentOrigin.PURCHASED && !dto.supplierId) {
      throw new BadRequestException(
        'supplierId est requis pour un composant de type PURCHASED (acheté à un fournisseur).',
      );
    }
    const created = await this.prisma.component.create({
      data: {
        ref: dto.ref,
        name: dto.name,
        unit: dto.unit,
        origin,
        supplierId: dto.supplierId,
        stockQty: dto.stockQty,
        minQty: dto.minQty,
        costPerUnit: dto.costPerUnit,
      },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'Component',
        entityId: created.id,
        action: 'STOCK_ADJUSTED',
        userId,
        changes: {
          stockQty: { after: Number(created.stockQty) },
          ref: { after: created.ref },
        },
        details: 'Component created',
      });
    }

    return created;
  }

  async update(id: string, dto: UpdateComponentDto, userId?: string) {
    if (dto.origin === ComponentOrigin.PURCHASED && dto.supplierId === null) {
      throw new BadRequestException(
        'supplierId ne peut pas être null pour un composant de type PURCHASED.',
      );
    }

    const before =
      dto.stockQty !== undefined
        ? await this.prisma.component.findUnique({
            where: { id },
            select: { stockQty: true },
          })
        : null;

    const updated = await this.prisma.component.update({
      where: { id },
      data: {
        ...(dto.ref !== undefined ? { ref: dto.ref } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
        ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
        ...(dto.stockQty !== undefined ? { stockQty: dto.stockQty } : {}),
        ...(dto.minQty !== undefined ? { minQty: dto.minQty } : {}),
        ...(dto.costPerUnit !== undefined ? { costPerUnit: dto.costPerUnit } : {}),
      },
    });

    if (userId && dto.stockQty !== undefined) {
      await this.auditService.log({
        entityType: 'Component',
        entityId: id,
        action: 'STOCK_ADJUSTED',
        userId,
        changes: {
          stockQty: {
            before: before ? Number(before.stockQty) : undefined,
            after: Number(updated.stockQty),
          },
        },
      });
    }

    return updated;
  }

  remove(id: string) {
    return this.prisma.component.delete({ where: { id } });
  }
}
