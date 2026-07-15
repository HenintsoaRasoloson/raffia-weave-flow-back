import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferenceLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLevelOrRef(input: {
    level?: number;
    ref?: string;
  }) {
    const level = this.resolveLevel(input);

    const [
      salesOrder,
      invoices,
      deliveries,
      productionOrders,
      purchaseOrders,
      salesOrderItems,
      batDocuments,
      invoiceItems,
      invoicePayments,
      invoiceDocuments,
      purchaseOrderItems,
      productionSteps,
    ] = await Promise.all([
      this.prisma.salesOrder.findFirst({
        where: { referenceLevel: level },
        include: { client: true },
      }),
      this.prisma.invoice.findMany({
        where: { referenceLevel: level },
        include: { client: true, salesOrder: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.delivery.findMany({
        where: { referenceLevel: level },
        include: { client: true, salesOrder: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productionOrder.findMany({
        where: { referenceLevel: level },
        include: { product: true, variant: true, salesOrder: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { referenceLevel: level },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.salesOrderItem.findMany({
        where: { referenceLevel: level },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.batDocument.findMany({
        where: { referenceLevel: level },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoiceItem.findMany({
        where: { referenceLevel: level },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoicePayment.findMany({
        where: { referenceLevel: level },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoiceDocument.findMany({
        where: { referenceLevel: level },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrderItem.findMany({
        where: { referenceLevel: level },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productionStep.findMany({
        where: { referenceLevel: level },
        include: { productionOrder: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      level,
      matchedBy: input.ref ? 'ref' : 'level',
      sourceRef: input.ref?.trim().toUpperCase(),
      salesOrder,
      invoices,
      deliveries,
      productionOrders,
      purchaseOrders,
      related: {
        salesOrderItems,
        batDocuments,
        invoiceItems,
        invoicePayments,
        invoiceDocuments,
        purchaseOrderItems,
        productionSteps,
      },
    };
  }

  private resolveLevel(input: { level?: number; ref?: string }) {
    if (input.level !== undefined) {
      return input.level;
    }

    if (!input.ref?.trim()) {
      throw new BadRequestException('Fournissez soit level, soit ref.');
    }

    const normalizedRef = input.ref.trim().toUpperCase();
    const match = normalizedRef.match(/^[A-Z]{2,4}\/(\d{6})$/);
    if (!match) {
      throw new BadRequestException(
        'Format ref invalide. Exemple attendu: CMD/000188',
      );
    }

    return Number(match[1]);
  }
}
