import { Injectable } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';

@Injectable()
export class ProductionOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    return this.prisma.productionOrder.findMany({
      where: {
        ...(query.status ? { status: query.status as any } : {}),
        ...(query.q
          ? {
              OR: [
                { orderNumber: { contains: query.q, mode: 'insensitive' } },
                { product: { is: { name: { contains: query.q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      include: { product: true, variant: true, salesOrder: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  findOne(id: string) {
    return this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        product: true,
        variant: true,
        salesOrder: true,
        salesOrderItem: true,
        stages: true,
      },
    });
  }

  create(dto: CreateProductionOrderDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.startDate) {
      payload.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      payload.endDate = new Date(dto.endDate);
    }

    return this.prisma.productionOrder.create({
      data: payload as any,
    });
  }

  update(id: string, dto: UpdateProductionOrderDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.startDate) {
      payload.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      payload.endDate = new Date(dto.endDate);
    }

    return this.prisma.productionOrder.update({
      where: { id },
      data: payload as any,
    });
  }

  updateProgress(id: string, dto: UpdateProductionProgressDto) {
    const clamped = Math.max(0, Math.min(100, dto.progress));
    return this.prisma.productionOrder.update({
      where: { id },
      data: {
        progress: clamped,
        ...(dto.status ? { status: dto.status as any } : {}),
      } as any,
    });
  }

  remove(id: string) {
    return this.prisma.productionOrder.delete({ where: { id } });
  }
}
