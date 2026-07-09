import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where = {
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.q
        ? {
            OR: [
              { orderNumber: { contains: query.q } },
              { supplier: { is: { name: { contains: query.q } } } },
            ],
          }
        : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.purchaseOrder.findMany({
          where,
          include: { supplier: true, items: true },
          orderBy: { orderDate: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.purchaseOrder.count({ where }),
      ]);

      return { items, total, page, pageSize };
    });
  }

  findOne(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    });
  }

  create(dto: CreatePurchaseOrderDto) {
    const totalHt = dto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber: dto.orderNumber,
        supplierId: dto.supplierId,
        status: (dto.status ?? 'DRAFT') as any,
        orderDate: new Date(dto.orderDate),
        expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
        totalHt,
        currency: dto.currency ?? 'EUR',
        notes: dto.notes,
        items: {
          create: dto.items.map((item) => ({
            componentId: item.componentId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
          })),
        },
      } as any,
      include: { supplier: true, items: true },
    });
  }

  update(id: string, dto: UpdatePurchaseOrderDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.expectedAt) payload.expectedAt = new Date(dto.expectedAt);
    if (dto.receivedAt) payload.receivedAt = new Date(dto.receivedAt);

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: payload as any,
      include: { supplier: true, items: true },
    });
  }

  async markReceived(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    const current = purchaseOrder.status as unknown as string;
    if (current === 'CANCELLED') {
      throw new BadRequestException('Un bon de commande annule ne peut pas etre recu');
    }

    if (current === 'RECEIVED') {
      throw new BadRequestException('Le bon de commande est deja recu');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'RECEIVED',
        receivedAt: new Date(),
      } as any,
      include: { supplier: true, items: true },
    });

    // Mettre à jour le stock des composants reçus
    for (const item of purchaseOrder.items) {
      if (item.componentId) {
        await this.prisma.component.update({
          where: { id: item.componentId },
          data: {
            stockQty: { increment: item.quantity },
          } as any,
        }).catch(() => { /* composant supprimé entre-temps */ });
      }
    }

    return updated;
  }

  remove(id: string) {
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
