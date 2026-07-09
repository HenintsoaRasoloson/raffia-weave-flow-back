import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const BUSINESS_DOC_SCOPE = 'business-documents';
const BUSINESS_DOC_LEVEL_LENGTH = 6;
const PURCHASE_ORDER_PREFIX = 'ACH';

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

    return this.prisma.$transaction(async (tx) => {
      let referenceLevel: number;
      let orderNumber: string;

      if (dto.orderNumber?.trim()) {
        const parsed = this.parsePurchaseOrderNumber(dto.orderNumber);
        referenceLevel = parsed.level;
        orderNumber = parsed.number;
      } else {
        referenceLevel = await this.allocateNextReferenceLevel(tx as any);
        orderNumber = this.buildPurchaseOrderNumber(referenceLevel);
      }

      return tx.purchaseOrder.create({
        data: {
          orderNumber,
          referenceLevel,
          supplierId: dto.supplierId,
          status: (dto.status ?? 'DRAFT') as any,
          orderDate: new Date(dto.orderDate),
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          totalHt,
          currency: dto.currency ?? 'EUR',
          notes: dto.notes,
          items: {
            create: dto.items.map((item) => ({
              referenceLevel,
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
    });
  }

  update(id: string, dto: UpdatePurchaseOrderDto) {
    const payload: Record<string, unknown> = { ...dto };
    if (dto.orderNumber !== undefined) {
      const parsed = this.parsePurchaseOrderNumber(dto.orderNumber);
      payload.orderNumber = parsed.number;
      payload.referenceLevel = parsed.level;
    }
    if (dto.expectedAt) payload.expectedAt = new Date(dto.expectedAt);
    if (dto.receivedAt) payload.receivedAt = new Date(dto.receivedAt);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: payload as any,
        include: { supplier: true, items: true },
      });

      if (payload.referenceLevel !== undefined) {
        await tx.purchaseOrderItem.updateMany({
          where: { purchaseOrderId: id },
          data: { referenceLevel: payload.referenceLevel as number },
        });
      }

      return updated;
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

  private buildPurchaseOrderNumber(level: number) {
    return `${PURCHASE_ORDER_PREFIX}/${level
      .toString()
      .padStart(BUSINESS_DOC_LEVEL_LENGTH, '0')}`;
  }

  private parsePurchaseOrderNumber(rawOrderNumber: string) {
    const normalized = rawOrderNumber.trim().toUpperCase();
    const regex = new RegExp(
      `^${PURCHASE_ORDER_PREFIX}\\/(\\d{${BUSINESS_DOC_LEVEL_LENGTH}})$`,
    );
    const match = normalized.match(regex);
    if (!match) {
      throw new BadRequestException(
        `Format achat invalide. Attendu: ${PURCHASE_ORDER_PREFIX}/${'0'.repeat(BUSINESS_DOC_LEVEL_LENGTH)}`,
      );
    }

    return {
      number: normalized,
      level: Number(match[1]),
    };
  }

  private async allocateNextReferenceLevel(tx: any) {
    const sequence = await tx.documentSequence.upsert({
      where: { scope: BUSINESS_DOC_SCOPE },
      update: { nextValue: { increment: 1 } },
      create: { scope: BUSINESS_DOC_SCOPE, nextValue: 2 },
      select: { nextValue: true },
    });

    return sequence.nextValue - 1;
  }
}
