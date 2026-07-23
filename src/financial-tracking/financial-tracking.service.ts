import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../common/audit.service';
import { buildFrenchTableTextWhere } from '../common/query/search.util';
import { NotificationsService } from '../notifications/notifications.service';
import { BudgetAlertQueryDto } from './dto/budget-alert-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFinancialBudgetDto } from './dto/create-financial-budget.dto';
import { CreateLedgerCategoryDto } from './dto/create-ledger-category.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { FinancialOverviewQueryDto } from './dto/financial-overview-query.dto';
import { ListFinancialBudgetsQueryDto } from './dto/list-financial-budgets-query.dto';
import { ListLedgerEntriesQueryDto } from './dto/list-ledger-entries-query.dto';
import { OverdueReminderQueryDto } from './dto/overdue-reminder-query.dto';

type InvoiceCostInput = {
  productId: string | null;
  variantId: string | null;
  quantity: number;
  revenueHt: number;
};

const DEFAULT_LEDGER_CATEGORIES = [
  {
    code: 'CLIENT_COLLECTION',
    name: 'Encaissement client',
    entryType: 'INCOME',
    description: 'Encaissements reels des factures clients',
  },
  {
    code: 'SUPPLIER_PAYMENT',
    name: 'Paiement fournisseur',
    entryType: 'EXPENSE',
    description: 'Decaissements reels lies aux achats fournisseurs',
  },
  {
    code: 'PAYROLL',
    name: 'Salaires',
    entryType: 'EXPENSE',
    description: 'Salaires, primes et charges de personnel',
  },
  {
    code: 'LOGISTICS',
    name: 'Logistique',
    entryType: 'EXPENSE',
    description: 'Transport, livraison, emballage et manutention',
  },
  {
    code: 'TAX',
    name: 'Fiscalite',
    entryType: 'EXPENSE',
    description: 'TVA, impots et echeances fiscales',
  },
  {
    code: 'OPERATING_EXPENSE',
    name: 'Charges operationnelles',
    entryType: 'EXPENSE',
    description: 'Charges generales et depenses d exploitation',
  },
  {
    code: 'INTERNAL_TRANSFER',
    name: 'Virement interne',
    entryType: 'TRANSFER',
    description: 'Mouvements internes non retenus en resultat',
  },
] as const;

@Injectable()
export class FinancialTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async listLedgerCategories() {
    await this.ensureDefaultCategories();

    return this.prisma.ledgerCategory.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  createLedgerCategory(dto: CreateLedgerCategoryDto) {
    return this.prisma.ledgerCategory.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        entryType: dto.entryType,
        description: dto.description?.trim(),
        active: dto.active ?? true,
      },
    });
  }

  async listBudgets(query: ListFinancialBudgetsQueryDto) {
    await this.ensureDefaultCategories();

    const overlapFilter = this.buildOverlapFilter(query.dateFrom, query.dateTo);
    const where = {
      ...(overlapFilter ?? {}),
      ...(query.ledgerCategoryId ? { ledgerCategoryId: query.ledgerCategoryId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
    };

    const budgets = await this.prisma.financialBudget.findMany({
      where,
      include: {
        ledgerCategory: true,
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: [{ periodStart: 'desc' }, { label: 'asc' }],
    });

    if (!budgets.length) {
      return { items: [], totalBudgeted: 0, totalActual: 0, totalVariance: 0 };
    }

    const range = budgets.reduce(
      (acc, budget) => ({
        from: budget.periodStart < acc.from ? budget.periodStart : acc.from,
        to: budget.periodEnd > acc.to ? budget.periodEnd : acc.to,
      }),
      { from: budgets[0].periodStart, to: budgets[0].periodEnd },
    );

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        entryDate: { gte: range.from, lte: range.to },
      },
      select: {
        entryDate: true,
        entryType: true,
        amount: true,
        ledgerCategoryId: true,
        clientId: true,
        supplierId: true,
      },
    });

    const items = budgets.map((budget) => {
      const actualAmount = this.sum(
        entries
          .filter((entry) => this.matchesBudgetEntry(budget, entry))
          .map((entry) => entry.amount),
      );
      const budgetAmount = this.toNumber(budget.amount);
      const variance = actualAmount - budgetAmount;

      return {
        ...budget,
        amount: this.round2(budget.amount),
        actualAmount: this.round2(actualAmount),
        variance: this.round2(variance),
        varianceRate:
          budgetAmount > 0 ? this.round2((variance / budgetAmount) * 100) : 0,
      };
    });

    return {
      items,
      totalBudgeted: this.round2(items.reduce((sum, item) => sum + item.amount, 0)),
      totalActual: this.round2(items.reduce((sum, item) => sum + item.actualAmount, 0)),
      totalVariance: this.round2(items.reduce((sum, item) => sum + item.variance, 0)),
    };
  }

  createBudget(dto: CreateFinancialBudgetDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    if (periodEnd < periodStart) {
      throw new BadRequestException('periodEnd doit etre posterieur ou egal a periodStart');
    }

    return this.prisma.financialBudget.create({
      data: {
        label: dto.label.trim(),
        direction: dto.direction,
        amount: dto.amount,
        currency: (dto.currency ?? 'MGA').toUpperCase(),
        periodStart,
        periodEnd,
        ledgerCategoryId: dto.ledgerCategoryId,
        clientId: dto.clientId,
        supplierId: dto.supplierId,
        notes: dto.notes,
      },
      include: {
        ledgerCategory: true,
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    }).then((budget) => ({
      ...budget,
      amount: this.round2(budget.amount),
    }));
  }

  async previewOverdueReminders(query: OverdueReminderQueryDto) {
    const items = await this.findOverdueReminderItems(query);

    return {
      asOf: query.asOf ? new Date(query.asOf) : new Date(),
      total: items.length,
      totalOutstandingAmount: this.round2(
        items.reduce((sum, item) => sum + item.outstandingAmount, 0),
      ),
      items,
    };
  }

  async notifyOverdueReminders(query: OverdueReminderQueryDto) {
    const preview = await this.previewOverdueReminders(query);

    for (const item of preview.items) {
      await this.notificationsService.notifyRole('RESPONSABLE_FINANCIER_STOCKS', {
        type: 'invoice_overdue_reminder',
        title: 'Facture client en retard',
        message: `${item.invoiceNumber} - ${item.clientName} - ${item.outstandingAmount.toFixed(2)} MGA`,
        data: {
          invoiceId: item.id,
          clientId: item.clientId,
          daysOverdue: item.daysOverdue,
          outstandingAmount: item.outstandingAmount,
          reminderMessage: item.reminderMessage,
        },
        actionUrl: `/invoices/${item.id}`,
        priority: item.daysOverdue >= 15 ? 'high' : 'normal',
      });
    }

    if (preview.items.length > 0) {
      await this.notificationsService.notifyRole('GERANT', {
        type: 'invoice_overdue_summary',
        title: 'Synthese impayes',
        message: `${preview.total} facture(s) en retard - ${preview.totalOutstandingAmount.toFixed(2)} MGA`,
        data: {
          totalInvoices: preview.total,
          totalOutstandingAmount: preview.totalOutstandingAmount,
        },
        actionUrl: '/financial-tracking',
        priority: 'high',
      });
    }

    return {
      ...preview,
      notifiedRoles: preview.items.length > 0
        ? ['RESPONSABLE_FINANCIER_STOCKS', 'GERANT']
        : [],
    };
  }

  async previewBudgetAlerts(query: BudgetAlertQueryDto) {
    const dateRange = this.resolveBudgetAlertPeriod(query.dateFrom, query.dateTo);
    const budgets = await this.listBudgets({
      dateFrom: dateRange.from.toISOString(),
      dateTo: dateRange.to.toISOString(),
      ledgerCategoryId: query.ledgerCategoryId,
    });

    const minVarianceRate = query.minVarianceRate ?? 0;
    const minVarianceAmount = query.minVarianceAmount ?? 0;
    const limit = query.limit ?? 20;

    const items = budgets.items
      .filter((budget) => budget.direction === 'EXPENSE')
      .filter((budget) => budget.variance > 0)
      .filter((budget) => budget.varianceRate >= minVarianceRate)
      .filter((budget) => budget.variance >= minVarianceAmount)
      .sort((a, b) => b.variance - a.variance)
      .slice(0, limit)
      .map((budget) => ({
        id: budget.id,
        label: budget.label,
        ledgerCategory: budget.ledgerCategory,
        budgetAmount: budget.amount,
        actualAmount: budget.actualAmount,
        variance: budget.variance,
        varianceRate: budget.varianceRate,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        alertMessage: this.buildBudgetAlertMessage(budget.label, budget.variance, budget.varianceRate),
      }));

    return {
      period: dateRange,
      thresholds: {
        minVarianceRate,
        minVarianceAmount,
        limit,
      },
      total: items.length,
      totalVarianceAmount: this.round2(items.reduce((sum, item) => sum + item.variance, 0)),
      items,
    };
  }

  async notifyBudgetAlerts(query: BudgetAlertQueryDto) {
    const preview = await this.previewBudgetAlerts(query);

    for (const item of preview.items) {
      await this.notificationsService.notifyRoles(
        ['RESPONSABLE_FINANCIER_STOCKS', 'GERANT'],
        {
          type: 'budget_overrun_detected',
          title: 'Depassement budgetaire',
          message: `${item.label} +${item.variance.toFixed(2)} MGA (${item.varianceRate.toFixed(2)}%)`,
          data: {
            budgetId: item.id,
            variance: item.variance,
            varianceRate: item.varianceRate,
            ledgerCategoryId: item.ledgerCategory?.id ?? null,
          },
          actionUrl: '/financial-tracking',
          priority: item.varianceRate >= 20 ? 'high' : 'normal',
        },
      );
    }

    return {
      ...preview,
      notifiedRoles: preview.items.length > 0
        ? ['RESPONSABLE_FINANCIER_STOCKS', 'GERANT']
        : [],
    };
  }

  async getOverview(query: FinancialOverviewQueryDto) {
    await this.ensureDefaultCategories();

    const period = this.resolvePeriod(query.dateFrom, query.dateTo);
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
      upcomingPurchaseOrders.map(
        (purchaseOrder) =>
          this.toNumber(purchaseOrder.totalHt) - this.toNumber(purchaseOrder.paidAmount ?? 0),
      ),
    );
    const operatingExpenses = periodOutflows;
    const { estimatedCost, estimatedRevenueHt } = await this.estimateInvoiceCosts(periodInvoices);
    const estimatedMarginAmount = estimatedRevenueHt - estimatedCost;
    const estimatedMarginRate =
      estimatedRevenueHt > 0 ? (estimatedMarginAmount / estimatedRevenueHt) * 100 : 0;
    const projectedBalance = trackedBalance + upcomingReceivables - purchaseCommitments;
    const budgetItems = budgets.map((budget) => {
      const actualAmount = this.sum(
        periodEntries
          .filter((entry) => this.matchesBudgetEntry(budget, entry))
          .map((entry) => entry.amount),
      );
      const budgetAmount = this.toNumber(budget.amount);
      const variance = actualAmount - budgetAmount;

      return {
        id: budget.id,
        label: budget.label,
        direction: budget.direction,
        budgetAmount: this.round2(budgetAmount),
        actualAmount: this.round2(actualAmount),
        variance: this.round2(variance),
        varianceRate: budgetAmount > 0 ? this.round2((variance / budgetAmount) * 100) : 0,
        ledgerCategory: budget.ledgerCategory,
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
      };
    });

    const budgetSummary = {
      totalBudgetedExpenses: this.round2(
        budgetItems
          .filter((item) => item.direction === 'EXPENSE')
          .reduce((sum, item) => sum + item.budgetAmount, 0),
      ),
      totalActualExpenses: this.round2(
        budgetItems
          .filter((item) => item.direction === 'EXPENSE')
          .reduce((sum, item) => sum + item.actualAmount, 0),
      ),
      totalBudgetedIncome: this.round2(
        budgetItems
          .filter((item) => item.direction === 'INCOME')
          .reduce((sum, item) => sum + item.budgetAmount, 0),
      ),
      totalActualIncome: this.round2(
        budgetItems
          .filter((item) => item.direction === 'INCOME')
          .reduce((sum, item) => sum + item.actualAmount, 0),
      ),
    };

    const categoryBreakdown = this.buildCategoryBreakdown(periodEntries);

    const alerts = [
      ...(overdueAmount > 0
        ? [
            {
              code: 'OVERDUE_INVOICES',
              severity: 'high',
              message: `${overdueInvoices.length} facture(s) en retard pour ${this.round2(overdueAmount)} MGA`,
            },
          ]
        : []),
      ...(projectedBalance < 0
        ? [
            {
              code: 'TREASURY_PRESSURE',
              severity: 'high',
              message: `Projection de tresorerie negative a ${horizonDays} jours: ${this.round2(projectedBalance)} MGA`,
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
      budgets: {
        ...budgetSummary,
        items: budgetItems,
      },
      margins: {
        estimatedRevenueHt: this.round2(estimatedRevenueHt),
        estimatedMarginAmount: this.round2(estimatedMarginAmount),
        estimatedMarginRate: this.round2(estimatedMarginRate),
      },
      categoryBreakdown,
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
        amount: this.round2(
          this.toNumber(purchaseOrder.totalHt) - this.toNumber(purchaseOrder.paidAmount ?? 0),
        ),
      })),
      alerts,
    };
  }

  async listLedgerEntries(query: ListLedgerEntriesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const dateFilter = this.buildDateFilter(query.dateFrom, query.dateTo);
    const textWhere = await buildFrenchTableTextWhere(
      this.prisma,
      'LedgerEntry',
      ['label', 'notes'],
      query.q,
    );

    const where = {
      ...(query.type ? { entryType: query.type } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.ledgerCategoryId ? { ledgerCategoryId: query.ledgerCategoryId } : {}),
      ...(dateFilter ? { entryDate: dateFilter } : {}),
      ...textWhere,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ledgerEntry.findMany({
        where,
        include: {
          ledgerCategory: true,
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

  async createLedgerEntry(dto: CreateLedgerEntryDto, userId?: string) {
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        entryDate: new Date(dto.entryDate),
        label: dto.label.trim(),
        entryType: dto.entryType,
        amount: dto.amount,
        currency: (dto.currency ?? 'MGA').toUpperCase(),
        ledgerCategoryId: dto.ledgerCategoryId,
        clientId: dto.clientId,
        supplierId: dto.supplierId,
        salesOrderId: dto.salesOrderId,
        invoiceId: dto.invoiceId,
        purchaseOrderId: dto.purchaseOrderId,
        notes: dto.notes,
      },
      include: {
        ledgerCategory: true,
        client: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        invoice: { select: { id: true, invoiceNumber: true } },
        salesOrder: { select: { id: true, orderNumber: true } },
        purchaseOrder: { select: { id: true, orderNumber: true } },
      },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'LedgerEntry',
        entityId: entry.id,
        action: 'LEDGER_ENTRY_CREATED',
        userId,
        details: `Manual ledger entry ${entry.entryType} ${entry.label}`,
        changes: {
          amount: { after: this.round2(entry.amount) },
          entryType: { after: entry.entryType },
        },
      });
    }

    return {
      ...entry,
      amount: this.round2(entry.amount),
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
          ledgerCategory: { select: { id: true, code: true, name: true } },
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

  private async ensureDefaultCategories() {
    const existingCount = await this.prisma.ledgerCategory.count();
    if (existingCount >= DEFAULT_LEDGER_CATEGORIES.length) {
      return;
    }

    await this.prisma.ledgerCategory.createMany({
      data: DEFAULT_LEDGER_CATEGORIES.map((category) => ({
        ...category,
        isSystem: true,
        active: true,
      })),
      skipDuplicates: true,
    });
  }

  private async findOverdueReminderItems(query: OverdueReminderQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const minDaysOverdue = query.minDaysOverdue ?? 1;
    const minOutstandingAmount = query.minOutstandingAmount ?? 0;
    const limit = query.limit ?? 20;
    const dueBefore = new Date(asOf);
    dueBefore.setDate(dueBefore.getDate() - minDaysOverdue);

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: { lte: dueBefore },
        status: { in: ['ISSUED', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        ...(query.clientId ? { clientId: query.clientId } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        totalTtc: true,
        paidAmount: true,
        currency: true,
        clientId: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            contactName: true,
          },
        },
      },
    });

    return overdueInvoices
      .map((invoice) => {
        const outstandingAmount = this.round2(
          this.toNumber(invoice.totalTtc) - this.toNumber(invoice.paidAmount ?? 0),
        );
        const daysOverdue = this.diffDays(asOf, invoice.dueDate ?? asOf);

        return {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          dueDate: invoice.dueDate,
          currency: invoice.currency,
          clientId: invoice.clientId,
          clientName: invoice.client?.name ?? 'Client inconnu',
          contactName: invoice.client?.contactName ?? null,
          email: invoice.client?.email ?? null,
          phone: invoice.client?.phone ?? null,
          outstandingAmount,
          daysOverdue,
          reminderMessage: this.buildOverdueReminderMessage({
            invoiceNumber: invoice.invoiceNumber,
            clientName: invoice.client?.name ?? 'Client',
            outstandingAmount,
            daysOverdue,
            dueDate: invoice.dueDate,
          }),
        };
      })
      .filter((invoice) => invoice.outstandingAmount >= minOutstandingAmount);
  }

  private resolvePeriod(dateFrom?: string, dateTo?: string) {
    const to = dateTo ? new Date(dateTo) : new Date();
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    return { from, to };
  }

  private resolveBudgetAlertPeriod(dateFrom?: string, dateTo?: string) {
    const to = dateTo ? new Date(dateTo) : new Date();
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(to.getFullYear(), to.getMonth(), 1);

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

  private buildOverlapFilter(dateFrom?: string, dateTo?: string) {
    if (!dateFrom && !dateTo) {
      return undefined;
    }

    return {
      ...(dateTo ? { periodStart: { lte: new Date(dateTo) } } : {}),
      ...(dateFrom ? { periodEnd: { gte: new Date(dateFrom) } } : {}),
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

  private buildCategoryBreakdown(
    entries: Array<{
      entryType: string;
      amount: unknown;
      ledgerCategoryId?: string | null;
      ledgerCategory?: { id: string; code: string; name: string } | null;
    }>,
  ) {
    const buckets = new Map<
      string,
      { id: string | null; code: string; name: string; entryType: string; amount: number }
    >();

    for (const entry of entries) {
      const key = entry.ledgerCategory?.id ?? `uncategorized:${entry.entryType}`;
      const bucket = buckets.get(key) ?? {
        id: entry.ledgerCategory?.id ?? null,
        code: entry.ledgerCategory?.code ?? 'UNCATEGORIZED',
        name: entry.ledgerCategory?.name ?? 'Non categorise',
        entryType: entry.entryType,
        amount: 0,
      };

      bucket.amount += this.toNumber(entry.amount);
      buckets.set(key, bucket);
    }

    return Array.from(buckets.values())
      .map((bucket) => ({ ...bucket, amount: this.round2(bucket.amount) }))
      .sort((a, b) => b.amount - a.amount);
  }

  private matchesBudgetEntry(
    budget: {
      direction: string;
      periodStart: Date;
      periodEnd: Date;
      ledgerCategoryId?: string | null;
      clientId?: string | null;
      supplierId?: string | null;
    },
    entry: {
      entryDate: Date;
      entryType: string;
      amount: unknown;
      ledgerCategoryId?: string | null;
      clientId?: string | null;
      supplierId?: string | null;
    },
  ) {
    const expectedEntryType = budget.direction === 'INCOME' ? 'INCOME' : 'EXPENSE';

    if (entry.entryType !== expectedEntryType) {
      return false;
    }
    if (entry.entryDate < budget.periodStart || entry.entryDate > budget.periodEnd) {
      return false;
    }
    if (budget.ledgerCategoryId && entry.ledgerCategoryId !== budget.ledgerCategoryId) {
      return false;
    }
    if (budget.clientId && entry.clientId !== budget.clientId) {
      return false;
    }
    if (budget.supplierId && entry.supplierId !== budget.supplierId) {
      return false;
    }

    return true;
  }

  private buildOverdueReminderMessage(input: {
    invoiceNumber: string;
    clientName: string;
    outstandingAmount: number;
    daysOverdue: number;
    dueDate: Date | null;
  }) {
    const dueDateLabel = input.dueDate
      ? input.dueDate.toLocaleDateString('fr-FR')
      : 'date inconnue';

    return `Relance: facture ${input.invoiceNumber} du client ${input.clientName}, echeance ${dueDateLabel}, retard ${input.daysOverdue} jour(s), reste ${input.outstandingAmount.toFixed(2)} MGA.`;
  }

  private buildBudgetAlertMessage(
    label: string,
    variance: number,
    varianceRate: number,
  ) {
    return `Budget ${label} en depassement de ${variance.toFixed(2)} MGA (${varianceRate.toFixed(2)}%).`;
  }

  private diffDays(later: Date, earlier: Date) {
    const diffMs = later.getTime() - earlier.getTime();
    return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
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