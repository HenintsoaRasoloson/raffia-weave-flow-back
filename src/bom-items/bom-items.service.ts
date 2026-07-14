import { Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { UpdateBomItemDto } from './dto/update-bom-item.dto';

@Injectable()
export class BomItemsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const where = {
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
    return this.prisma.bomItem.create({
      data: {
        productId: dto.productId,
        variantId: dto.variantId,
        componentId: dto.componentId,
        colorId: dto.colorId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
      },
    });
  }

  update(id: string, dto: UpdateBomItemDto) {
    return this.prisma.bomItem.update({
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
  }

  remove(id: string) {
    return this.prisma.bomItem.delete({ where: { id } });
  }
}
