import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  PurchaseOrderStatus,
} from '../generated/prisma/client';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { enumWhere } from '../common/prisma/enum-filter.util';
import { dateFieldWhere, optionalEquals } from '../common/query/date-range.util';
import { buildFrenchTextSearchOr } from '../common/query/search.util';
import { resolveOrderBy } from '../common/query/sort.util';
import { AuditService } from '../common/audit.service';
import { lockComponentsForUpdate } from '../common/stock/stock-lock.util';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentReferenceService } from '../common/document-reference/document-reference.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { RecordPurchaseOrderPaymentDto } from './dto/record-purchase-order-payment.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

const PURCHASE_ORDER_PREFIX = 'ACH';
const PURCHASE_ORDER_SORT_FIELDS = [
  'orderDate',
  'createdAt',
  'expectedAt',
  'totalHt',
  'orderNumber',
] as const;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentReferenceService: DocumentReferenceService,
    private readonly auditService: AuditService,
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
      ...optionalEquals('supplierId', query.supplierId),
      ...dateFieldWhere('orderDate', query.dateFrom, query.dateTo),
      ...(textOr ? { OR: textOr } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        tx.purchaseOrder.findMany({
          where,
          include: { supplier: true, items: true, payments: true },
          orderBy: resolveOrderBy(query, PURCHASE_ORDER_SORT_FIELDS, 'orderDate'),
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
          currency: dto.currency ?? 'MGA',
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

  async markReceived(id: string, userId?: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Bon de commande introuvable');
      }

      if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
        throw new BadRequestException(
          'Un bon de commande annule ne peut pas etre recu',
        );
      }

      if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('Le bon de commande est deja recu');
      }

      const claimed = await tx.purchaseOrder.updateMany({
        where: {
          id,
          status: {
            notIn: [
              PurchaseOrderStatus.RECEIVED,
              PurchaseOrderStatus.CANCELLED,
            ],
          },
        },
        data: {
          status: PurchaseOrderStatus.RECEIVED,
          receivedAt: new Date(),
        },
      });

      if (claimed.count !== 1) {
        throw new BadRequestException('Le bon de commande est deja recu');
      }

      const stockItems = purchaseOrder.items.filter((item) => item.componentId);
      const locked = await lockComponentsForUpdate(
        tx,
        stockItems.map((item) => item.componentId as string),
      );

      for (const item of stockItems) {
        const componentId = item.componentId as string;
        if (!locked.has(componentId)) {
          throw new BadRequestException(
            `Composant introuvable pour la ligne de reception (${componentId})`,
          );
        }

        await tx.component.update({
          where: { id: componentId },
          data: {
            stockQty: { increment: item.quantity },
          },
        });
      }

      return tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        include: { supplier: true, items: true, payments: true },
      });
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'PurchaseOrder',
        entityId: id,
        action: 'PURCHASE_ORDER_RECEIVED',
        userId,
        changes: {
          status: { before: 'PREVIOUS', after: PurchaseOrderStatus.RECEIVED },
        },
        details: `Reception BC ${updated.orderNumber}`,
      });
    }

    return updated;
  }

  async recordPayment(
    id: string,
    dto: RecordPurchaseOrderPaymentDto,
    userId?: string,
  ) {
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

    const updated = await this.prisma.$transaction(async (tx) => {
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
          currency: purchaseOrder.currency ?? 'MGA',
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

    if (userId) {
      await this.auditService.log({
        entityType: 'PurchaseOrder',
        entityId: id,
        action: 'PURCHASE_ORDER_PAYMENT_RECORDED',
        userId,
        changes: {
          paidAmount: { before: alreadyPaid, after: newPaidAmount },
          amount: { after: dto.amount },
        },
      });
    }

    return updated;
  }

  remove(id: string) {
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}

