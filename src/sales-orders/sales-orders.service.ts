import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderStatusDto } from './dto/update-sales-order-status.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

@Injectable()
export class SalesOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.salesOrder.findMany({
      include: { client: true, items: true, invoices: true, deliveries: true },
      orderBy: { orderDate: 'desc' },
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

  updateStatus(id: string, dto: UpdateSalesOrderStatusDto) {
    return this.prisma.salesOrder.update({
      where: { id },
      data: { status: dto.status as any },
    });
  }

  remove(id: string) {
    return this.prisma.salesOrder.delete({ where: { id } });
  }
}
