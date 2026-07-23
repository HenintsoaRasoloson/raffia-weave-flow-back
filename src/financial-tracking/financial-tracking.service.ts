import { BadRequestException, Injectable } from '@nestjs/common';
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
import { ensureDefaultLedgerCategories } from './financial-categories.seed';
import { FinancialOverviewService } from './financial-overview.service';
import {
  matchesBudgetEntry,
  round2,
  sum,
  toNumber,
} from './financial-tracking.math';

@Injectable()
export class FinancialTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly overviewService: FinancialOverviewService,
  ) {}

  async listLedgerCategories() {
    await ensureDefaultLedgerCategories(this.prisma);

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
    await ensureDefaultLedgerCategories(this.prisma);

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
      const actualAmount = sum(
        entries
          .filter((entry) => matchesBudgetEntry(budget, entry))
          .map((entry) => entry.amount),
      );
      const budgetAmount = toNumber(budget.amount);
      const variance = actualAmount - budgetAmount;

      return {
        ...budget,
        amount: round2(budget.amount),
        actualAmount: round2(actualAmount),
        variance: round2(variance),
        varianceRate:
          budgetAmount > 0 ? round2((variance / budgetAmount) * 100) : 0,
      };
    });

    return {
      items,
      totalBudgeted: round2(items.reduce((acc, item) => acc + item.amount, 0)),
      totalActual: round2(items.reduce((acc, item) => acc + item.actualAmount, 0)),
      totalVariance: round2(items.reduce((acc, item) => acc + item.variance, 0)),
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
      amount: round2(budget.amount),
    }));
  }

  async previewOverdueReminders(query: OverdueReminderQueryDto) {
    const items = await this.findOverdueReminderItems(query);

    return {
      asOf: query.asOf ? new Date(query.asOf) : new Date(),
      total: items.length,
      totalOutstandingAmount: round2(
        items.reduce((acc, item) => acc + item.outstandingAmount, 0),
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
      totalVarianceAmount: round2(items.reduce((acc, item) => acc + item.variance, 0)),
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

  getOverview(query: FinancialOverviewQueryDto) {
    return this.overviewService.getOverview(query);
  }

  getClientSummary(clientId: string, query: FinancialOverviewQueryDto) {
    return this.overviewService.getClientSummary(clientId, query);
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
        amount: round2(item.amount),
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
          amount: { after: round2(entry.amount) },
          entryType: { after: entry.entryType },
        },
      });
    }

    return {
      ...entry,
      amount: round2(entry.amount),
    };
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
        const outstandingAmount = round2(
          toNumber(invoice.totalTtc) - toNumber(invoice.paidAmount ?? 0),
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
}
