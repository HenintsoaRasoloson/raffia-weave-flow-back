import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  PurchaseOrderStatus,
} from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { RecordPurchaseOrderPaymentDto } from './dto/record-purchase-order-payment.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const PURCHASE_ORDER_PREFIX = 'ACH';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentReferenceService: DocumentReferenceService,
  ) {}

  async findAll(query: ListQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const textOr = await buildFrenchTextSearchOr(this.prisma, {
      term: query.q,
      scalarFields: ['orderNumber'],
      relations: [{ table: 'Supplier', columns: ['name'], foreignKey: 'supplierId' }],
    });
    const where: Prisma.PurchaseOrderWhereInput = {
      ...enumWhere('status', query.status, PurchaseOrderStatus),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.purchaseOrder.findMany({
          where,
          include: { supplier: true, items: true, payments: true },
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
      include: { supplier: true, items: true, payments: true },
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
        const parsed = this.documentReferenceService.parseReferenceNumber(
          PURCHASE_ORDER_PREFIX,
          dto.orderNumber,
          'achat',
        );
        referenceLevel = parsed.level;
        orderNumber = parsed.number;
      } else {
        referenceLevel = await this.documentReferenceService.allocateNextReferenceLevel(tx);
        orderNumber = this.documentReferenceService.buildReferenceNumber(
          PURCHASE_ORDER_PREFIX,
          referenceLevel,
        );
      }

      return tx.purchaseOrder.create({
        data: {
          orderNumber,
          referenceLevel,
          supplierId: dto.supplierId,
          status: dto.status ?? PurchaseOrderStatus.DRAFT,
          orderDate: new Date(dto.orderDate),
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          paidAmount: 0,
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
        },
        include: { supplier: true, items: true, payments: true },
      });
    });
  }

  update(id: string, dto: UpdatePurchaseOrderDto) {
    const data: Prisma.PurchaseOrderUpdateInput = {
      ...(dto.supplierId !== undefined ? { supplierId: dto.supplierId } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    };

    if (dto.orderNumber !== undefined) {
      const parsed = this.documentReferenceService.parseReferenceNumber(
        PURCHASE_ORDER_PREFIX,
        dto.orderNumber,
        'achat',
      );
      data.orderNumber = parsed.number;
      data.referenceLevel = parsed.level;
    }
    if (dto.expectedAt) data.expectedAt = new Date(dto.expectedAt);
    if (dto.receivedAt) data.receivedAt = new Date(dto.receivedAt);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data,
        include: { supplier: true, items: true, payments: true },
      });

      if (data.referenceLevel !== undefined && typeof data.referenceLevel === 'number') {
        await tx.purchaseOrderItem.updateMany({
          where: { purchaseOrderId: id },
          data: { referenceLevel: data.referenceLevel },
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

    const current = purchaseOrder.status;
    if (current === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Un bon de commande annule ne peut pas etre recu');
    }

    if (current === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Le bon de commande est deja recu');
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.RECEIVED,
        receivedAt: new Date(),
      },
      include: { supplier: true, items: true, payments: true },
    });

    // Mettre à jour le stock des composants reçus
    for (const item of purchaseOrder.items) {
      if (item.componentId) {
        await this.prisma.component.update({
          where: { id: item.componentId },
          data: {
            stockQty: { increment: item.quantity },
          },
        }).catch(() => undefined);
      }
    }

    return updated;
  }

  async recordPayment(id: string, dto: RecordPurchaseOrderPaymentDto) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalHt: true,
        paidAmount: true,
        currency: true,
        supplierId: true,
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Bon de commande introuvable');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Impossible d enregistrer un paiement sur un bon de commande annule',
      );
    }

    const alreadyPaid = Number(purchaseOrder.paidAmount ?? 0);
    const total = Number(purchaseOrder.totalHt);
    const newPaidAmount = alreadyPaid + dto.amount;

    if (newPaidAmount > total) {
      throw new BadRequestException(
        `Le montant decaisse (${newPaidAmount}) depasse le total achat (${total})`,
      );
    }

    const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.ledgerCategory.upsert({
        where: { code: 'SUPPLIER_PAYMENT' },
        update: {
          name: 'Paiement fournisseur',
          entryType: 'EXPENSE',
          description: 'Decaissements reels lies aux achats fournisseurs',
          active: true,
          isSystem: true,
        },
        create: {
          code: 'SUPPLIER_PAYMENT',
          name: 'Paiement fournisseur',
          entryType: 'EXPENSE',
          description: 'Decaissements reels lies aux achats fournisseurs',
          active: true,
          isSystem: true,
        },
      });

      await tx.purchaseOrderPayment.create({
        data: {
          purchaseOrderId: id,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          paidAt,
          notes: dto.notes,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          entryDate: paidAt,
          label: `Paiement fournisseur ${purchaseOrder.orderNumber}`,
          entryType: 'EXPENSE',
          amount: dto.amount,
          currency: purchaseOrder.currency ?? 'EUR',
          supplierId: purchaseOrder.supplierId,
          purchaseOrderId: purchaseOrder.id,
          ledgerCategoryId: category.id,
          notes: dto.notes,
        },
      });

      return tx.purchaseOrder.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          paidAt: newPaidAmount >= total ? paidAt : null,
        },
        include: { supplier: true, items: true, payments: true },
      });
    });
  }

  remove(id: string) {
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}

