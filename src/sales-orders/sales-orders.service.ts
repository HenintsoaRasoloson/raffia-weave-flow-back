import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.type ? { orderType: query.type as any } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q } },
              { client: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.salesOrder.findMany({
          where,
          include: { client: true, items: true, invoices: true, deliveries: true },
          orderBy: { orderDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.salesOrder.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        invoices: true,
        deliveries: true,
        productionOrders: true,
      },
    });
  }

  async create(dto: CreateSalesOrderDto) {
    const taxRate = dto.taxRate ?? 20;
    const items = dto.items ?? [];
    const totalHt = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceHt,
      0,
    );
    const totalTtc = totalHt * (1 + taxRate / 100);

    return this.prisma.salesOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        clientId: dto.clientId,
        orderType: dto.orderType as any,
        status: (dto.status ?? 'TO_PROCESS') as any,
        orderDate: new Date(dto.orderDate),
        taxRate,
        totalHt,
        totalTtc,
        currency: dto.currency ?? 'EUR',
        notes: dto.notes,
        items: {
          create: items.map((item) => {
            const lineTotalHt = item.quantity * item.unitPriceHt;
            return {
              description: item.description,
              quantity: item.quantity,
              unitPriceHt: item.unitPriceHt,
              taxRate: item.taxRate ?? taxRate,
              lineTotalHt,
              productId: item.productId,
              variantId: item.variantId,
            };
          }),
        },
      } as any,
      include: { items: true, client: true },
    });
  }

  update(id: string, dto: UpdateSalesOrderDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.orderDate) {
      payload.orderDate = new Date(dto.orderDate);
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: payload as any,
    });
  }

  async updateStatus(id: string, dto: UpdateSalesOrderStatusDto) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!order) {
      throw new NotFoundException('Commande introuvable');
    }

    const allowedTransitions: Record<string, string[]> = {
      QUOTE: ['TO_PROCESS', 'CANCELLED'],
      TO_PROCESS: ['IN_PRODUCTION', 'PREPARING', 'CANCELLED'],
      IN_PRODUCTION: ['PREPARING', 'SHIPPED', 'CANCELLED'],
      PREPARING: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['INVOICED'],
      INVOICED: [],
      CANCELLED: [],
    };

    const current = order.status as unknown as string;
    const next = dto.status;
    if (!allowedTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Transition invalide: ${current} -> ${next}`,
      );
    }

    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: next as any },
    });
  }

  remove(id: string) {
    return this.prisma.salesOrder.delete({ where: { id } });
  }
}
