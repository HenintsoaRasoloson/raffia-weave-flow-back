import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { FinancialOverviewQueryDto } from './dto/financial-overview-query.dto';
import { ListLedgerEntriesQueryDto } from './dto/list-ledger-entries-query.dto';

type InvoiceCostInput = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
  revenueHt: number;
};

@Injectable()
export class FinancialTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: FinancialOverviewQueryDto) {
    const period = this.resolvePeriod(query.dateFrom, query.dateTo);
    const horizonDays = query.horizonDays ?? 30;
    const now = new Date();
    const horizonDate = new Date(now);
    horizonDate.setDate(horizonDate.getDate() + horizonDays);

    const clientWhere = query.clientId ? { clientId: query.clientId } : {};

    const [
      trackedEntries,
      periodEntries,
      periodInvoices,
      periodPayments,
      overdueInvoices,
      upcomingInvoices,
      upcomingPurchaseOrders,
    ] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: {
          entryDate: { lte: now },
          ...clientWhere,
        },
        select: { entryType: true, amount: true },
      }),
      this.prisma.ledgerEntry.findMany({
        where: {
          entryDate: { gte: period.from, lte: period.to },
          ...clientWhere,
        },
        select: { entryType: true, amount: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          issueDate: { gte: period.from, lte: period.to },
          ...clientWhere,
        },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          totalTtc: true,
          subtotalHt: true,
          paidAmount: true,
          status: true,
          client: { select: { id: true, name: true } },
          items: {
            select: {
              productId: true,
              variantId: true,
              quantity: true,
              lineTotalHt: true,
            },
          },
        },
      }),
      this.prisma.invoicePayment.findMany({
        where: {
          paidAt: { gte: period.from, lte: period.to },
          ...(query.clientId
            ? {
                invoice: {
                  clientId: query.clientId,
                },
              }
            : {}),
        },
        select: { amount: true },
      }),
      this.prisma.invoice.findMany({
        where: {
          dueDate: { lt: now },
          status: { in: ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          ...clientWhere,
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          totalTtc: true,
          paidAmount: true,
          status: true,
          client: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          dueDate: { gte: now, lte: horizonDate },
          status: { in: ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
          ...clientWhere,
        },
        select: {
          id: true,
          invoiceNumber: true,
          dueDate: true,
          totalTtc: true,
          paidAmount: true,
        },
      }),
      this.prisma.purchaseOrder.findMany({
        where: {
          expectedAt: { gte: now, lte: horizonDate },
          status: { in: ['CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'] },
        },
        select: {
          id: true,
          orderNumber: true,
          expectedAt: true,
          totalHt: true,
          supplier: { select: { name: true } },
        },
      }),
    ]);

    const trackedBalance = this.computeTrackedBalance(trackedEntries);
    const periodInflows = this.sumLedgerEntries(periodEntries, 'INCOME');
    const periodOutflows = this.sumLedgerEntries(periodEntries, 'EXPENSE');
    const invoicedTtc = this.sum(periodInvoices.map((invoice) => invoice.totalTtc));
    const invoicedHt = this.sum(periodInvoices.map((invoice) => invoice.subtotalHt));
    const collectedAmount = this.sum(periodPayments.map((payment) => payment.amount));
    const outstandingAmount = this.sum(
      periodInvoices.map(
        (invoice) => this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const overdueAmount = this.sum(
      overdueInvoices.map(
        (invoice) => this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const upcomingReceivables = this.sum(
      upcomingInvoices.map(
        (invoice) => this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const purchaseCommitments = this.sum(
      upcomingPurchaseOrders.map((purchaseOrder) => purchaseOrder.totalHt),
    );
    const operatingExpenses = periodOutflows;
    const { estimatedCost, estimatedRevenueHt } = await this.estimateInvoiceCosts(periodInvoices);
    const estimatedMarginAmount = estimatedRevenueHt - estimatedCost;
    const estimatedMarginRate =
      estimatedRevenueHt > 0 ? (estimatedMarginAmount / estimatedRevenueHt) * 100 : 0;
    const projectedBalance = trackedBalance + upcomingReceivables - purchaseCommitments;

    const alerts = [
      ...(overdueAmount > 0
        ? [
            {
              code: 'OVERDUE_INVOICES',
              severity: 'high',
              message: `${overdueInvoices.length} facture(s) en retard pour ${this.round2(overdueAmount)} EUR`,
            },
          ]
        : []),
      ...(projectedBalance < 0
        ? [
            {
              code: 'TREASURY_PRESSURE',
              severity: 'high',
              message: `Projection de tresorerie negative a ${horizonDays} jours: ${this.round2(projectedBalance)} EUR`,
            },
          ]
        : []),
      ...(upcomingInvoices.length > 0
        ? [
            {
              code: 'UPCOMING_COLLECTIONS',
              severity: 'medium',
              message: `${upcomingInvoices.length} encaissement(s) attendu(s) sous ${horizonDays} jours`,
            },
          ]
        : []),
    ];

    return {
      period: {
        from: period.from,
        to: period.to,
        horizonDays,
        clientId: query.clientId ?? null,
      },
      treasury: {
        trackedBalance: this.round2(trackedBalance),
        periodInflows: this.round2(periodInflows),
        periodOutflows: this.round2(periodOutflows),
        upcomingReceivables: this.round2(upcomingReceivables),
        purchaseCommitments: this.round2(purchaseCommitments),
        projectedBalance: this.round2(projectedBalance),
      },
      revenue: {
        invoicedHt: this.round2(invoicedHt),
        invoicedTtc: this.round2(invoicedTtc),
        collectedAmount: this.round2(collectedAmount),
        outstandingAmount: this.round2(outstandingAmount),
        overdueAmount: this.round2(overdueAmount),
        overdueInvoicesCount: overdueInvoices.length,
      },
      costs: {
        operatingExpenses: this.round2(operatingExpenses),
        purchaseCommitments: this.round2(purchaseCommitments),
        estimatedProductionCost: this.round2(estimatedCost),
      },
      margins: {
        estimatedRevenueHt: this.round2(estimatedRevenueHt),
        estimatedMarginAmount: this.round2(estimatedMarginAmount),
        estimatedMarginRate: this.round2(estimatedMarginRate),
      },
      overdueInvoices: overdueInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client?.name ?? null,
        dueDate: invoice.dueDate,
        status: invoice.status,
        outstandingAmount: this.round2(
          this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
        ),
      })),
      upcomingPurchaseOrders: upcomingPurchaseOrders.map((purchaseOrder) => ({
        id: purchaseOrder.id,
        orderNumber: purchaseOrder.orderNumber,
        supplierName: purchaseOrder.supplier?.name ?? null,
        expectedAt: purchaseOrder.expectedAt,
        amount: this.round2(purchaseOrder.totalHt),
      })),
      alerts,
    };
  }

  async listLedgerEntries(query: ListLedgerEntriesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const dateFilter = this.buildDateFilter(query.dateFrom, query.dateTo);

    const where = {
      ...(query.type ? { entryType: query.type } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(dateFilter ? { entryDate: dateFilter } : {}),
      ...(query.q
        ? {
            OR: [
              { label: { contains: query.q } },
              { notes: { contains: query.q } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          supplier: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
          purchaseOrder: { select: { id: true, orderNumber: true } },
        },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        amount: this.round2(item.amount),
      })),
      total,
      page,
      pageSize,
    };
  }

  async createLedgerEntry(dto: CreateLedgerEntryDto) {
    return this.prisma.ledgerEntry.create({
      data: {
        entryDate: new Date(dto.entryDate),
        label: dto.label.trim(),
        entryType: dto.entryType,
        amount: dto.amount,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        clientId: dto.clientId,
        supplierId: dto.supplierId,
        salesOrderId: dto.salesOrderId,
        invoiceId: dto.invoiceId,
        purchaseOrderId: dto.purchaseOrderId,
        notes: dto.notes,
      },
      include: {
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        salesOrder: { select: { id: true, orderNumber: true } },
        purchaseOrder: { select: { id: true, orderNumber: true } },
      },
    }).then((entry) => ({
      ...entry,
      amount: this.round2(entry.amount),
    }));
  }

  async getClientSummary(clientId: string, query: FinancialOverviewQueryDto) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        email: true,
        phone: true,
        city: true,
        country: true,
      },
    });

    if (!client) {
      throw new NotFoundException('Client introuvable');
    }

    const period = this.resolvePeriod(query.dateFrom, query.dateTo);
    const now = new Date();

    const [invoices, payments, ledgerEntries] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          clientId,
          issueDate: { gte: period.from, lte: period.to },
        },
        orderBy: { issueDate: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          issueDate: true,
          dueDate: true,
          status: true,
          subtotalHt: true,
          totalTtc: true,
          paidAmount: true,
          items: {
            select: {
              productId: true,
              variantId: true,
              quantity: true,
              lineTotalHt: true,
            },
          },
        },
      }),
      this.prisma.invoicePayment.findMany({
        where: {
          paidAt: { gte: period.from, lte: period.to },
          invoice: { clientId },
        },
        orderBy: { paidAt: 'desc' },
        take: 20,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paidAt: true,
          notes: true,
          invoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      this.prisma.ledgerEntry.findMany({
        where: { clientId },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take: 20,
        select: {
          id: true,
          entryDate: true,
          label: true,
          entryType: true,
          amount: true,
          currency: true,
          notes: true,
          invoice: { select: { id: true, invoiceNumber: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
        },
      }),
    ]);

    const invoicedTtc = this.sum(invoices.map((invoice) => invoice.totalTtc));
    const collectedAmount = this.sum(payments.map((payment) => payment.amount));
    const outstandingAmount = this.sum(
      invoices.map(
        (invoice) => this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const overdueInvoices = invoices.filter(
      (invoice) =>
        invoice.dueDate &&
        invoice.dueDate < now &&
        ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status),
    );
    const overdueAmount = this.sum(
      overdueInvoices.map(
        (invoice) => this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const trackedBalance = this.computeTrackedBalance(ledgerEntries);
    const { estimatedCost, estimatedRevenueHt } = await this.estimateInvoiceCosts(invoices);
    const estimatedMarginAmount = estimatedRevenueHt - estimatedCost;
    const estimatedMarginRate =
      estimatedRevenueHt > 0 ? (estimatedMarginAmount / estimatedRevenueHt) * 100 : 0;

    return {
      client,
      period,
      finance: {
        invoicedTtc: this.round2(invoicedTtc),
        collectedAmount: this.round2(collectedAmount),
        outstandingAmount: this.round2(outstandingAmount),
        overdueAmount: this.round2(overdueAmount),
        overdueInvoicesCount: overdueInvoices.length,
        trackedBalance: this.round2(trackedBalance),
        estimatedMarginAmount: this.round2(estimatedMarginAmount),
        estimatedMarginRate: this.round2(estimatedMarginRate),
      },
      recentInvoices: invoices.slice(0, 10).map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        totalTtc: this.round2(invoice.totalTtc),
        paidAmount: this.round2(invoice.paidAmount ?? 0),
        outstandingAmount: this.round2(
          this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
        ),
      })),
      recentPayments: payments.map((payment) => ({
        id: payment.id,
        invoiceId: payment.invoice?.id ?? null,
        invoiceNumber: payment.invoice?.invoiceNumber ?? null,
        amount: this.round2(payment.amount),
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        notes: payment.notes,
      })),
      ledgerEntries: ledgerEntries.map((entry) => ({
        ...entry,
        amount: this.round2(entry.amount),
      })),
    };
  }

  private async estimateInvoiceCosts(
    invoices: Array<{
      items: Array<{
        productId: string | null;
        variantId: string | null;
        quantity: number;
        lineTotalHt: unknown;
      }>;
    }>,
  ) {
    const invoiceItems: InvoiceCostInput[] = invoices.flatMap((invoice) =>
      invoice.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        revenueHt: this.toNumber(item.lineTotalHt),
      })),
    );

    const productIds = Array.from(
      new Set(
        invoiceItems
          .map((item) => item.productId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (!productIds.length) {
      return { estimatedCost: 0, estimatedRevenueHt: 0 };
    }

    const bomItems = await this.prisma.bomItem.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
        unitCost: true,
        component: {
          select: {
            costPerUnit: true,
          },
        },
      },
    });

    const unitCostMap = new Map<string, number>();

    for (const bomItem of bomItems) {
      const key = this.buildCostKey(bomItem.productId, bomItem.variantId);
      const componentUnitCost = this.toNumber(
        bomItem.unitCost ?? bomItem.component?.costPerUnit ?? 0,
      );
      const lineCost = this.toNumber(bomItem.quantity) * componentUnitCost;

      unitCostMap.set(key, (unitCostMap.get(key) ?? 0) + lineCost);
    }

    let estimatedCost = 0;
    let estimatedRevenueHt = 0;

    for (const item of invoiceItems) {
      estimatedRevenueHt += item.revenueHt;
      if (!item.productId) {
        continue;
      }

      const genericCost = unitCostMap.get(this.buildCostKey(item.productId, null)) ?? 0;
      const variantOnlyCost = item.variantId
        ? unitCostMap.get(this.buildCostKey(item.productId, item.variantId)) ?? 0
        : 0;
      const unitCost = genericCost + variantOnlyCost;
      estimatedCost += unitCost * item.quantity;
    }

    return { estimatedCost, estimatedRevenueHt };
  }

  private resolvePeriod(dateFrom?: string, dateTo?: string) {
    const to = dateTo ? new Date(dateTo) : new Date();
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    return { from, to };
  }

  private buildDateFilter(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) {
      return undefined;
    }

    return {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  private sum(values: Array<number | { toString(): string } | null | undefined>) {
    return values.reduce((total, value) => total + this.toNumber(value ?? 0), 0);
  }

  private sumLedgerEntries(
    entries: Array<{ entryType: string; amount: unknown }>,
    entryType: 'INCOME' | 'EXPENSE',
  ) {
    return entries
      .filter((entry) => entry.entryType === entryType)
      .reduce((total, entry) => total + this.toNumber(entry.amount), 0);
  }

  private computeTrackedBalance(entries: Array<{ entryType: string; amount: unknown }>) {
    return entries.reduce((balance, entry) => {
      const amount = this.toNumber(entry.amount);
      if (entry.entryType === 'INCOME') {
        return balance + amount;
      }
      if (entry.entryType === 'EXPENSE') {
        return balance - amount;
      }
      return balance;
    }, 0);
  }

  private buildCostKey(productId: string, variantId: string | null) {
    return `${productId}::${variantId ?? 'base'}`;
  }

  private toNumber(value: unknown) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return Number(value);
    }

    if (value && typeof value === 'object' && 'toString' in value) {
      return Number(value.toString());
    }

    return 0;
  }

  private round2(value: unknown) {
    return Math.round(this.toNumber(value) * 100) / 100;
  }
}