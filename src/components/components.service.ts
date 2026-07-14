import { BadRequestException, Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { ComponentOrigin } from '../generated/prisma/client';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@Injectable()
export class ComponentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['ref', 'name'],
    });
    const where = {
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.component.findMany({
          where,
          include: { supplier: true },
          orderBy: { createdAt: 'desc' },
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

  create(dto: CreateComponentDto) {
    const origin = dto.origin ?? ComponentOrigin.PURCHASED;
    if (origin === ComponentOrigin.PURCHASED && !dto.supplierId) {
      throw new BadRequestException(
        'supplierId est requis pour un composant de type PURCHASED (acheté à un fournisseur).',
      );
    }
    return this.prisma.component.create({
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
  }

  update(id: string, dto: UpdateComponentDto) {
    if (dto.origin === ComponentOrigin.PURCHASED && dto.supplierId === null) {
      throw new BadRequestException(
        'supplierId ne peut pas être null pour un composant de type PURCHASED.',
      );
    }
    return this.prisma.component.update({
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
  }

  remove(id: string) {
    return this.prisma.component.delete({ where: { id } });
  }
}
