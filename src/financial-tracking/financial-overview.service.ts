import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialOverviewQueryDto } from './dto/financial-overview-query.dto';
import { ensureDefaultLedgerCategories } from './financial-categories.seed';
import {
  buildCategoryBreakdown,
  buildCostKey,
  computeTrackedBalance,
  matchesBudgetEntry,
  resolvePeriod,
  round2,
  sum,
  sumLedgerEntries,
  toNumber,
} from './financial-tracking.math';

type InvoiceCostInput = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
  revenueHt: number;
};

@Injectable()
export class FinancialOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(query: FinancialOverviewQueryDto) {
    await ensureDefaultLedgerCategories(this.prisma);

    const period = resolvePeriod(query.dateFrom, query.dateTo);
    const horizonDays = query.horizonDays ?? 30;
    const now = new Date();
    const horizonDate = new Date(now);
    horizonDate.setDate(horizonDate.getDate() + horizonDays);

    const clientWhere = query.clientId ? { clientId: query.clientId } : {};

    const [
      trackedEntries,
      periodEntries,
      budgets,
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
        select: {
          entryType: true,
          amount: true,
          ledgerCategoryId: true,
          ledgerCategory: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.financialBudget.findMany({
        where: {
          periodStart: { lte: period.to },
          periodEnd: { gte: period.from },
          ...(query.clientId ? { clientId: query.clientId } : {}),
        },
        include: {
          ledgerCategory: { select: { id: true, code: true, name: true } },
        },
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
          paidAmount: true,
          supplier: { select: { name: true } },
        },
      }),
    ]);

    const trackedBalance = computeTrackedBalance(trackedEntries);
    const periodInflows = sumLedgerEntries(periodEntries, 'INCOME');
    const periodOutflows = sumLedgerEntries(periodEntries, 'EXPENSE');
    const invoicedTtc = sum(periodInvoices.map((invoice) => invoice.totalTtc));
    const invoicedHt = sum(periodInvoices.map((invoice) => invoice.subtotalHt));
    const collectedAmount = sum(periodPayments.map((payment) => payment.amount));
    const outstandingAmount = sum(
      periodInvoices.map(
        (invoice) => toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const overdueAmount = sum(
      overdueInvoices.map(
        (invoice) => toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const upcomingReceivables = sum(
      upcomingInvoices.map(
        (invoice) => toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const purchaseCommitments = sum(
      upcomingPurchaseOrders.map(
        (purchaseOrder) =>
          toNumber(purchaseOrder.totalHt) - toNumber(purchaseOrder.paidAmount ?? 0),
      ),
    );
    const operatingExpenses = periodOutflows;
    const { estimatedCost, estimatedRevenueHt } =
      await this.estimateInvoiceCosts(periodInvoices);
    const estimatedMarginAmount = estimatedRevenueHt - estimatedCost;
    const estimatedMarginRate =
      estimatedRevenueHt > 0 ? (estimatedMarginAmount / estimatedRevenueHt) * 100 : 0;
    const projectedBalance = trackedBalance + upcomingReceivables - purchaseCommitments;
    const budgetItems = budgets.map((budget) => {
      const actualAmount = sum(
        periodEntries
          .filter((entry) => matchesBudgetEntry(budget, entry))
          .map((entry) => entry.amount),
      );
      const budgetAmount = toNumber(budget.amount);
      const variance = actualAmount - budgetAmount;

      return {
        id: budget.id,
        label: budget.label,
        direction: budget.direction,
        budgetAmount: round2(budgetAmount),
        actualAmount: round2(actualAmount),
        variance: round2(variance),
        varianceRate: budgetAmount > 0 ? round2((variance / budgetAmount) * 100) : 0,
        ledgerCategory: budget.ledgerCategory,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
      };
    });

    const budgetSummary = {
      totalBudgetedExpenses: round2(
        budgetItems
          .filter((item) => item.direction === 'EXPENSE')
          .reduce((sumValue, item) => sumValue + item.budgetAmount, 0),
      ),
      totalActualExpenses: round2(
        budgetItems
          .filter((item) => item.direction === 'EXPENSE')
          .reduce((sumValue, item) => sumValue + item.actualAmount, 0),
      ),
      totalBudgetedIncome: round2(
        budgetItems
          .filter((item) => item.direction === 'INCOME')
          .reduce((sumValue, item) => sumValue + item.budgetAmount, 0),
      ),
      totalActualIncome: round2(
        budgetItems
          .filter((item) => item.direction === 'INCOME')
          .reduce((sumValue, item) => sumValue + item.actualAmount, 0),
      ),
    };

    const categoryBreakdown = buildCategoryBreakdown(periodEntries);

    const alerts = [
      ...(overdueAmount > 0
        ? [
            {
              code: 'OVERDUE_INVOICES',
              severity: 'high',
              message: `${overdueInvoices.length} facture(s) en retard pour ${round2(overdueAmount)} MGA`,
            },
          ]
        : []),
      ...(projectedBalance < 0
        ? [
            {
              code: 'TREASURY_PRESSURE',
              severity: 'high',
              message: `Projection de tresorerie negative a ${horizonDays} jours: ${round2(projectedBalance)} MGA`,
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
      ...(budgetItems.some((item) => item.direction === 'EXPENSE' && item.variance > 0)
        ? [
            {
              code: 'BUDGET_OVERRUN',
              severity: 'medium',
              message: 'Au moins un budget de depense depasse le reel previsionnel',
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
        trackedBalance: round2(trackedBalance),
        periodInflows: round2(periodInflows),
        periodOutflows: round2(periodOutflows),
        upcomingReceivables: round2(upcomingReceivables),
        purchaseCommitments: round2(purchaseCommitments),
        projectedBalance: round2(projectedBalance),
      },
      revenue: {
        invoicedHt: round2(invoicedHt),
        invoicedTtc: round2(invoicedTtc),
        collectedAmount: round2(collectedAmount),
        outstandingAmount: round2(outstandingAmount),
        overdueAmount: round2(overdueAmount),
        overdueInvoicesCount: overdueInvoices.length,
      },
      costs: {
        operatingExpenses: round2(operatingExpenses),
        purchaseCommitments: round2(purchaseCommitments),
        estimatedProductionCost: round2(estimatedCost),
      },
      budgets: {
        ...budgetSummary,
        items: budgetItems,
      },
      margins: {
        estimatedRevenueHt: round2(estimatedRevenueHt),
        estimatedMarginAmount: round2(estimatedMarginAmount),
        estimatedMarginRate: round2(estimatedMarginRate),
      },
      categoryBreakdown,
      overdueInvoices: overdueInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client?.name ?? null,
        dueDate: invoice.dueDate,
        status: invoice.status,
        outstandingAmount: round2(
          toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
        ),
      })),
      upcomingPurchaseOrders: upcomingPurchaseOrders.map((purchaseOrder) => ({
        id: purchaseOrder.id,
        orderNumber: purchaseOrder.orderNumber,
        supplierName: purchaseOrder.supplier?.name ?? null,
        expectedAt: purchaseOrder.expectedAt,
        amount: round2(
          toNumber(purchaseOrder.totalHt) - toNumber(purchaseOrder.paidAmount ?? 0),
        ),
      })),
      alerts,
    };
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

    const period = resolvePeriod(query.dateFrom, query.dateTo);
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
          ledgerCategory: { select: { id: true, code: true, name: true } },
          notes: true,
          invoice: { select: { id: true, invoiceNumber: true } },
          salesOrder: { select: { id: true, orderNumber: true } },
        },
      }),
    ]);

    const invoicedTtc = sum(invoices.map((invoice) => invoice.totalTtc));
    const collectedAmount = sum(payments.map((payment) => payment.amount));
    const outstandingAmount = sum(
      invoices.map(
        (invoice) => toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const overdueInvoices = invoices.filter(
      (invoice) =>
        invoice.dueDate &&
        invoice.dueDate < now &&
        ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status),
    );
    const overdueAmount = sum(
      overdueInvoices.map(
        (invoice) => toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
      ),
    );
    const trackedBalance = computeTrackedBalance(ledgerEntries);
    const { estimatedCost, estimatedRevenueHt } = await this.estimateInvoiceCosts(invoices);
    const estimatedMarginAmount = estimatedRevenueHt - estimatedCost;
    const estimatedMarginRate =
      estimatedRevenueHt > 0 ? (estimatedMarginAmount / estimatedRevenueHt) * 100 : 0;

    return {
      client,
      period,
      finance: {
        invoicedTtc: round2(invoicedTtc),
        collectedAmount: round2(collectedAmount),
        outstandingAmount: round2(outstandingAmount),
        overdueAmount: round2(overdueAmount),
        overdueInvoicesCount: overdueInvoices.length,
        trackedBalance: round2(trackedBalance),
        estimatedMarginAmount: round2(estimatedMarginAmount),
        estimatedMarginRate: round2(estimatedMarginRate),
      },
      recentInvoices: invoices.slice(0, 10).map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        totalTtc: round2(invoice.totalTtc),
        paidAmount: round2(invoice.paidAmount ?? 0),
        outstandingAmount: round2(
          toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
        ),
      })),
      recentPayments: payments.map((payment) => ({
        id: payment.id,
        invoiceId: payment.invoice?.id ?? null,
        invoiceNumber: payment.invoice?.invoiceNumber ?? null,
        amount: round2(payment.amount),
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        notes: payment.notes,
      })),
      ledgerEntries: ledgerEntries.map((entry) => ({
        ...entry,
        amount: round2(entry.amount),
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
        revenueHt: toNumber(item.lineTotalHt),
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
      const key = buildCostKey(bomItem.productId, bomItem.variantId);
      const componentUnitCost = toNumber(
        bomItem.unitCost ?? bomItem.component?.costPerUnit ?? 0,
      );
      const lineCost = toNumber(bomItem.quantity) * componentUnitCost;

      unitCostMap.set(key, (unitCostMap.get(key) ?? 0) + lineCost);
    }

    let estimatedCost = 0;
    let estimatedRevenueHt = 0;

    for (const item of invoiceItems) {
      estimatedRevenueHt += item.revenueHt;
      if (!item.productId) {
        continue;
      }

      const genericCost = unitCostMap.get(buildCostKey(item.productId, null)) ?? 0;
      const variantOnlyCost = item.variantId
        ? (unitCostMap.get(buildCostKey(item.productId, item.variantId)) ?? 0)
        : 0;
      const unitCost = genericCost + variantOnlyCost;
      estimatedCost += unitCost * item.quantity;
    }

    return { estimatedCost, estimatedRevenueHt };
  }
}
