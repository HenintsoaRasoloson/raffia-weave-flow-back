import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.q
        ? {
            OR: [
              { deliveryNumber: { contains: query.q } },
              { carrier: { contains: query.q } },
              { trackingCode: { contains: query.q } },
              { client: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.delivery.findMany({
          where,
          include: { client: true, salesOrder: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.delivery.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.delivery.findUnique({
      where: { id },
      include: { client: true, salesOrder: true },
    });
  }

  create(dto: CreateDeliveryDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.eta) {
      payload.eta = new Date(dto.eta);
    }

    return this.prisma.delivery.create({
      data: payload as any,
    });
  }

  update(id: string, dto: UpdateDeliveryDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.eta) {
      payload.eta = new Date(dto.eta);
    }

    return this.prisma.delivery.update({
      where: { id },
      data: payload as any,
    });
  }

  async markDelivered(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!delivery) {
      throw new NotFoundException('Livraison introuvable');
    }

    const allowedSourceStatuses = ['PREPARING', 'IN_TRANSIT'];
    const current = delivery.status as unknown as string;
    if (!allowedSourceStatuses.includes(current)) {
      throw new BadRequestException(
        `Transition invalide: ${current} -> DELIVERED`,
      );
    }

    return this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
      } as any,
    });
  }

  remove(id: string) {
    return this.prisma.delivery.delete({ where: { id } });
  }
}
