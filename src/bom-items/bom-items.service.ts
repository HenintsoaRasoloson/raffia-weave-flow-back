import { Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { UpdateBomItemDto } from './dto/update-bom-item.dto';

@Injectable()
export class BomItemsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.q
        ? {
            OR: [
              { product: { name: { contains: query.q } } },
              { component: { name: { contains: query.q } } },
            ],
          }
        : {}),
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
          orderBy: { createdAt: 'desc' },
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

  create(dto: CreateBomItemDto) {
    return this.prisma.bomItem.create({ data: dto as any });
  }

  update(id: string, dto: UpdateBomItemDto) {
    return this.prisma.bomItem.update({ where: { id }, data: dto as any });
  }

  remove(id: string) {
    return this.prisma.bomItem.delete({ where: { id } });
  }
}
