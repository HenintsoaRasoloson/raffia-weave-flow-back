import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { CACHE_KEYS, CACHE_TTL_MS } from '../common/cache/cache-keys';
import { DEFAULT_CURRENCY } from '../common/currency/currency.constants';
import {
  formatMoneyLabel,
  formatSignedMoneyLabel,
} from '../common/currency/currency.util';
import { SALES_ORDER_IN_PROGRESS_STATUSES } from '../common/domain/sales-order-status.transitions';
import { FinancialTrackingService } from '../financial-tracking/financial-tracking.service';
import { PrismaService } from '../prisma/prisma.service';
import { absoluteDelta, percentDelta, signedDelta } from './dashboard.metrics';
import {
  KpiDto,
  RevenueSeries,
  ProductionOrder,
  RecentOrder,
  Alert,
  QuickStat,
  DashboardDto,
  PlanningCalendarEvent,
  PlanningCalendarResponse,
  WorkshopQueueDto,
  WorkshopQueueItem,
  WorkshopQueueLane,
} from './dto/dashboard.dto';

type PlanningEventType = 'PRODUCTION' | 'DELIVERY' | 'PURCHASE';

interface PlanningCalendarQuery {
  from?: string;
  to?: string;
  types?: string;
}

const PRODUCTION_ACTIVE_STATUSES = ['PLANNED', 'PREPARATION', 'IN_PROGRESS'] as const;
const DELIVERY_PENDING_STATUSES = ['PLANNED', 'PREPARING', 'IN_TRANSIT'] as const;
const INVOICE_OPEN_STATUSES = [
  'DRAFT',
  'ISSUED',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
] as const;
const INVOICE_PENDING_STATUSES = ['DRAFT', 'ISSUED'] as const;
const SALES_TO_PROCESS_STATUSES = ['QUOTE', 'TO_PROCESS'] as const;
const LOW_STOCK_THRESHOLD = 50;
const QUEUE_ITEM_LIMIT = 8;
const PRODUCT_CRITICAL_STOCK = 1;

const PRODUCTION_STATUS_LABELS: Record<string, ProductionOrder['status']> = {
  PLANNED: 'Planifié',
  PREPARATION: 'Préparation',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Terminé',
};

const SALES_ORDER_STATUS_LABELS: Record<string, string> = {
  QUOTE: 'Devis',
  TO_PROCESS: 'À traiter',
  IN_PRODUCTION: 'En production',
  PREPARING: 'Préparation',
  SHIPPED: 'Expédiée',
  DELIVERED: 'Livrée',
  INVOICED: 'Facturée',
  CANCELLED: 'Annulée',
};

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financialTrackingService: FinancialTrackingService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getDashboard(days: number = 30): Promise<DashboardDto> {
    const cacheKey = CACHE_KEYS.dashboard(days);
    const cached = await this.cache.get<DashboardDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const [
      kpis,
      revenueSeries,
      productionOrders,
      recentOrders,
      alerts,
      quickStats,
      queue,
    ] = await Promise.all([
      this.getKpis(days),
      this.getRevenueChart(8),
      this.getProductionOrders(),
      this.getRecentOrders(10),
      this.getAlerts(),
      this.getQuickStats(),
      this.getWorkshopQueue(),
    ]);

    const response = {
      kpis,
      revenueSeries,
      productionOrders,
      recentOrders,
      alerts,
      quickStats,
      queue,
    };
    await this.cache.set(cacheKey, response, CACHE_TTL_MS.dashboard);
    return response;
  }

  async getKpis(days: number = 30): Promise<KpiDto[]> {
    const cacheKey = CACHE_KEYS.dashboardKpis(days);
    const cached = await this.cache.get<KpiDto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const previousSince = new Date(since);
    previousSince.setDate(previousSince.getDate() - days);

    const periodEnd = new Date();

    const [orders, previousOrders, inProgressOrders, previousInProgress, overview, previousOverview] =
      await Promise.all([
        this.prisma.salesOrder.findMany({
          where: { createdAt: { gte: since } },
          select: { totalTtc: true },
        }),
        this.prisma.salesOrder.findMany({
          where: {
            createdAt: { gte: previousSince, lt: since },
          },
          select: { totalTtc: true },
        }),
        this.prisma.salesOrder.count({
          where: { status: { in: [...SALES_ORDER_IN_PROGRESS_STATUSES] } },
        }),
        this.prisma.salesOrder.count({
          where: {
            status: { in: [...SALES_ORDER_IN_PROGRESS_STATUSES] },
            createdAt: { lt: since },
          },
        }),
        this.financialTrackingService.getOverview({
          dateFrom: since.toISOString(),
          dateTo: periodEnd.toISOString(),
        }),
        this.financialTrackingService.getOverview({
          dateFrom: previousSince.toISOString(),
          dateTo: since.toISOString(),
        }),
      ]);

    const currentCA = orders.reduce((sum, order) => sum + Number(order.totalTtc ?? 0), 0);
    const previousCA = previousOrders.reduce(
      (sum, order) => sum + Number(order.totalTtc ?? 0),
      0,
    );
    const caDelta = percentDelta(currentCA, previousCA);
    const ordersDelta = absoluteDelta(inProgressOrders, previousInProgress);

    const currentMargin = overview.margins.estimatedMarginRate;
    const previousMargin = previousOverview.margins.estimatedMarginRate;
    const marginDelta = percentDelta(currentMargin, previousMargin);

    const currency = await this.getCompanyCurrency();
    const treasury = overview.treasury.trackedBalance;
    const previousTreasury = previousOverview.treasury.trackedBalance;
    const treasuryDelta = signedDelta(
      treasury - previousTreasury,
      (value) => formatSignedMoneyLabel(value, currency),
    );

    const kpis: KpiDto[] = [
      {
        label: "Chiffre d'affaires",
        value: formatMoneyLabel(currentCA, currency),
        delta: caDelta.delta,
        trend: caDelta.trend,
        hint: 'vs période précédente',
      },
      {
        label: 'Commandes en cours',
        value: inProgressOrders.toString(),
        delta: ordersDelta.delta,
        trend: ordersDelta.trend,
        hint: 'B2B + B2C',
      },
      {
        label: 'Marge moyenne',
        value: `${currentMargin.toFixed(1)}%`,
        delta: marginDelta.delta,
        trend: marginDelta.trend,
        hint: 'vs période précédente',
      },
      {
        label: 'Trésorerie',
        value: formatMoneyLabel(treasury, currency),
        delta: treasuryDelta.delta,
        trend: treasuryDelta.trend,
        hint: 'disponible',
      },
    ];
    await this.cache.set(cacheKey, kpis, CACHE_TTL_MS.dashboard);
    return kpis;
  }

  async getRevenueChart(months: number = 8): Promise<RevenueSeries[]> {
    const data: RevenueSeries[] = [];
    const monthNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
    ];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const orders = await this.prisma.salesOrder.findMany({
        where: {
          orderDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: { orderType: true, totalTtc: true },
      });

      const b2b = orders
        .filter((order) => order.orderType === 'B2B')
        .reduce((sum, order) => sum + Number(order.totalTtc ?? 0), 0);

      const b2c = orders
        .filter((order) => order.orderType === 'B2C')
        .reduce((sum, order) => sum + Number(order.totalTtc ?? 0), 0);

      data.push({
        month: monthNames[date.getMonth()],
        b2b: Math.round(b2b),
        b2c: Math.round(b2c),
      });
    }

    return data;
  }

  async getProductionOrders(): Promise<ProductionOrder[]> {
    const orders = await this.prisma.productionOrder.findMany({
      where: {
        status: { in: [...PRODUCTION_ACTIVE_STATUSES] },
      },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      product: order.product.name,
      qty: order.quantity,
      status: PRODUCTION_STATUS_LABELS[String(order.status)] ?? 'En cours',
      progress: order.progress,
      start: order.startDate
        ? order.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : '-',
      end: order.endDate
        ? order.endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : '-',
    }));
  }

  async getRecentOrders(limit: number = 10): Promise<RecentOrder[]> {
    const currency = await this.getCompanyCurrency();
    const orders = await this.prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        client: { select: { name: true } },
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      client: order.client?.name ?? 'Client inconnu',
      type: order.orderType,
      date: order.orderDate.toLocaleDateString('fr-FR'),
      total: formatMoneyLabel(
        Number(order.totalTtc ?? 0),
        order.currency ?? currency,
      ),
      status: SALES_ORDER_STATUS_LABELS[String(order.status)] ?? String(order.status),
    }));
  }

  async getAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    const behindOrders = await this.prisma.productionOrder.findMany({
      where: {
        status: { in: [...PRODUCTION_ACTIVE_STATUSES] },
        endDate: { lt: new Date() },
      },
      orderBy: { endDate: 'asc' },
      take: 1,
      select: { id: true, orderNumber: true },
    });

    if (behindOrders.length > 0) {
      alerts.push({
        id: behindOrders[0].id,
        type: 'warning',
        icon: 'AlertTriangle',
        title: 'Production derrière planning',
        message: `${behindOrders[0].orderNumber} dépasse la date prévue`,
        actionUrl: `/production/${behindOrders[0].id}`,
      });
    }

    const lowStockComponents = await this.prisma.component.findMany({
      where: {
        stockQty: { lte: LOW_STOCK_THRESHOLD },
      },
      orderBy: { stockQty: 'asc' },
      take: 1,
      select: { id: true, name: true, stockQty: true },
    });

    if (lowStockComponents.length > 0) {
      alerts.push({
        id: lowStockComponents[0].id,
        type: 'info',
        icon: 'Sparkles',
        title: 'Stock bas',
        message: `Réassortir ${lowStockComponents[0].name} — stock actuel: ${Number(lowStockComponents[0].stockQty)}.`,
        actionUrl: '/composants',
      });
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthOrders = await this.prisma.salesOrder.findMany({
      where: { orderDate: { gte: monthStart } },
      select: { totalTtc: true },
    });

    const thisMonthCA = monthOrders.reduce(
      (sum, order) => sum + Number(order.totalTtc ?? 0),
      0,
    );

    if (thisMonthCA > 0) {
      const currency = await this.getCompanyCurrency();
      alerts.push({
        id: 'success-1',
        type: 'success',
        icon: 'TrendingUp',
        title: 'Rythme actuel',
        message: `CA mensuel: ${formatMoneyLabel(thisMonthCA, currency)}`,
        actionUrl: '/ventes',
      });
    }

    return alerts;
  }

  async getWorkshopQueue(): Promise<WorkshopQueueDto> {
    const cached = await this.cache.get<WorkshopQueueDto>(CACHE_KEYS.dashboardQueue);
    if (cached) {
      return cached;
    }

    const today = this.startOfToday();
    const currency = await this.getCompanyCurrency();

    const [
      toProcessCount,
      toProcessRows,
      toProduceCount,
      toProduceRows,
      toProduceOverdue,
      toDeliverCount,
      toDeliverRows,
      toDeliverOverdue,
      toCollectCount,
      toCollectRows,
      toCollectOverdue,
      criticalProductsCount,
      criticalProductRows,
      componentRows,
      productCount,
    ] = await Promise.all([
      this.prisma.salesOrder.count({
        where: { status: { in: [...SALES_TO_PROCESS_STATUSES] } },
      }),
      this.prisma.salesOrder.findMany({
        where: { status: { in: [...SALES_TO_PROCESS_STATUSES] } },
        orderBy: { orderDate: 'asc' },
        take: QUEUE_ITEM_LIMIT,
        include: { client: { select: { name: true } } },
      }),
      this.prisma.productionOrder.count({
        where: { status: { in: [...PRODUCTION_ACTIVE_STATUSES] } },
      }),
      this.prisma.productionOrder.findMany({
        where: { status: { in: [...PRODUCTION_ACTIVE_STATUSES] } },
        orderBy: [{ endDate: 'asc' }, { createdAt: 'asc' }],
        take: QUEUE_ITEM_LIMIT,
        include: { product: { select: { name: true, ref: true } } },
      }),
      this.prisma.productionOrder.count({
        where: {
          status: { in: [...PRODUCTION_ACTIVE_STATUSES] },
          endDate: { lt: today },
        },
      }),
      this.prisma.delivery.count({
        where: { status: { in: [...DELIVERY_PENDING_STATUSES] } },
      }),
      this.prisma.delivery.findMany({
        where: { status: { in: [...DELIVERY_PENDING_STATUSES] } },
        orderBy: { eta: 'asc' },
        take: QUEUE_ITEM_LIMIT,
        include: { client: { select: { name: true } } },
      }),
      this.prisma.delivery.count({
        where: {
          status: { in: [...DELIVERY_PENDING_STATUSES] },
          eta: { lt: today },
        },
      }),
      this.prisma.invoice.count({
        where: {
          status: { in: [...INVOICE_OPEN_STATUSES] },
          type: { not: 'CREDIT_NOTE' },
        },
      }),
      this.prisma.invoice.findMany({
        where: {
          status: { in: [...INVOICE_OPEN_STATUSES] },
          type: { not: 'CREDIT_NOTE' },
        },
        orderBy: [{ dueDate: 'asc' }, { issueDate: 'asc' }],
        take: QUEUE_ITEM_LIMIT,
        include: { client: { select: { name: true } } },
      }),
      this.prisma.invoice.count({
        where: {
          status: { in: [...INVOICE_OPEN_STATUSES] },
          type: { not: 'CREDIT_NOTE' },
          dueDate: { lt: today },
        },
      }),
      this.prisma.product.count({
        where: {
          status: { not: 'ARCHIVED' },
          OR: [
            { stockOnHand: { lte: PRODUCT_CRITICAL_STOCK } },
            { status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } },
          ],
        },
      }),
      this.prisma.product.findMany({
        where: {
          status: { not: 'ARCHIVED' },
          OR: [
            { stockOnHand: { lte: PRODUCT_CRITICAL_STOCK } },
            { status: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] } },
          ],
        },
        orderBy: { stockOnHand: 'asc' },
        take: QUEUE_ITEM_LIMIT,
        select: {
          id: true,
          ref: true,
          name: true,
          stockOnHand: true,
          status: true,
        },
      }),
      this.prisma.component.findMany({
        orderBy: { stockQty: 'asc' },
        take: 40,
        select: {
          id: true,
          ref: true,
          name: true,
          stockQty: true,
          minQty: true,
          unit: true,
        },
      }),
      this.prisma.product.count({
        where: { status: { not: 'ARCHIVED' } },
      }),
    ]);

    const criticalComponents = componentRows.filter(
      (component) => Number(component.stockQty) <= Number(component.minQty),
    );
    const productSlots = Math.min(criticalProductRows.length, QUEUE_ITEM_LIMIT);
    const componentSlots = Math.max(0, QUEUE_ITEM_LIMIT - productSlots);
    const stockItems: WorkshopQueueItem[] = [
      ...criticalProductRows.slice(0, productSlots).map((product) => {
        const status =
          product.stockOnHand <= 0 ? 'OUT_OF_STOCK' : String(product.status);
        return {
          id: product.id,
          kind: 'product' as const,
          title: product.name,
          subtitle: product.ref,
          status,
          meta: `stock ${product.stockOnHand}`,
          dueDate: null,
          overdue: product.stockOnHand <= 0,
          qty: product.stockOnHand,
          amount: null,
        };
      }),
      ...criticalComponents.slice(0, componentSlots).map((component) => ({
        id: component.id,
        kind: 'component' as const,
        title: component.name,
        subtitle: component.ref,
        status: 'LOW_STOCK',
        meta: `${Number(component.stockQty)} ${String(component.unit).toLowerCase()} · min ${Number(component.minQty)}`,
        dueDate: null,
        overdue: true,
        qty: Number(component.stockQty),
        amount: null,
      })),
    ];

    const toProcess: WorkshopQueueLane = {
      count: toProcessCount,
      items: toProcessRows.map((order) => ({
        id: order.id,
        kind: 'salesOrder' as const,
        title: order.orderNumber,
        subtitle: `${order.client?.name ?? 'Client inconnu'} · ${order.orderType}`,
        status: String(order.status),
        meta: formatMoneyLabel(
          Number(order.totalTtc ?? 0),
          order.currency ?? currency,
        ),
        dueDate: order.orderDate.toISOString(),
        overdue: false,
        qty: null,
        amount: formatMoneyLabel(
          Number(order.totalTtc ?? 0),
          order.currency ?? currency,
        ),
      })),
    };

    const toProduce: WorkshopQueueLane = {
      count: toProduceCount,
      items: toProduceRows.map((order) => {
        const overdue = Boolean(order.endDate && order.endDate < today);
        return {
          id: order.id,
          kind: 'productionOrder' as const,
          title: order.orderNumber,
          subtitle: order.product.name,
          status: String(order.status),
          meta: `${order.quantity} pcs${order.endDate ? ` · ${this.formatShortDate(order.endDate)}` : ''}`,
          dueDate: order.endDate?.toISOString() ?? null,
          overdue,
          qty: order.quantity,
          amount: null,
        };
      }),
    };

    const toDeliver: WorkshopQueueLane = {
      count: toDeliverCount,
      items: toDeliverRows.map((delivery) => {
        const overdue = Boolean(delivery.eta && delivery.eta < today);
        return {
          id: delivery.id,
          kind: 'delivery' as const,
          title: delivery.deliveryNumber,
          subtitle: delivery.client.name,
          status: String(delivery.status),
          meta: delivery.eta ? this.formatShortDate(delivery.eta) : 'ETA —',
          dueDate: delivery.eta?.toISOString() ?? null,
          overdue,
          qty: null,
          amount: null,
        };
      }),
    };

    const toCollect: WorkshopQueueLane = {
      count: toCollectCount,
      items: toCollectRows.map((invoice) => {
        const remaining = Math.max(
          0,
          Number(invoice.totalTtc ?? 0) - Number(invoice.paidAmount ?? 0),
        );
        const overdue = Boolean(invoice.dueDate && invoice.dueDate < today);
        return {
          id: invoice.id,
          kind: 'invoice' as const,
          title: invoice.invoiceNumber,
          subtitle: invoice.client.name,
          status: String(invoice.status),
          meta: formatMoneyLabel(remaining, invoice.currency ?? currency),
          dueDate: invoice.dueDate?.toISOString() ?? null,
          overdue,
          qty: null,
          amount: formatMoneyLabel(remaining, invoice.currency ?? currency),
        };
      }),
    };

    const criticalStock: WorkshopQueueLane = {
      count: criticalProductsCount + criticalComponents.length,
      items: stockItems,
    };

    const queue: WorkshopQueueDto = {
      toProcess,
      toProduce,
      toDeliver,
      toCollect,
      criticalStock,
      productCount,
      overdueCount: toProduceOverdue + toDeliverOverdue + toCollectOverdue,
    };

    await this.cache.set(CACHE_KEYS.dashboardQueue, queue, CACHE_TTL_MS.dashboard);
    return queue;
  }

  async getQuickStats(): Promise<QuickStat[]> {
    const [catalogCount, deliveryCount, invoiceCount, shareCount] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.delivery.count({
        where: { status: { in: [...DELIVERY_PENDING_STATUSES] } },
      }),
      this.prisma.invoice.count({
        where: { status: { in: [...INVOICE_PENDING_STATUSES] } },
      }),
      this.prisma.catalogShare.count({
        where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
      }),
    ]);

    return [
      {
        to: '/catalogue',
        icon: 'Package',
        label: 'Catalogue produits',
        hint: `${catalogCount} références`,
      },
      {
        to: '/livraisons',
        icon: 'Truck',
        label: 'Livraisons à planifier',
        hint: `${deliveryCount} en attente`,
      },
      {
        to: '/facturation',
        icon: 'FileText',
        label: 'Factures à émettre',
        hint: `${invoiceCount} documents`,
      },
      {
        to: '/catalogues-partages',
        icon: 'Link2',
        label: 'Liens catalogue actifs',
        hint: `${shareCount} partages`,
      },
    ];
  }

  async getPlanningCalendar(query: PlanningCalendarQuery = {}): Promise<PlanningCalendarResponse> {
    const { from, to } = this.resolvePlanningRange(query.from, query.to);
    const types = this.resolvePlanningTypes(query.types);

    const [productionEvents, deliveryEvents, purchaseEvents] = await Promise.all([
      types.has('PRODUCTION') ? this.loadProductionCalendarEvents(from, to) : Promise.resolve([]),
      types.has('DELIVERY') ? this.loadDeliveryCalendarEvents(from, to) : Promise.resolve([]),
      types.has('PURCHASE') ? this.loadPurchaseCalendarEvents(from, to) : Promise.resolve([]),
    ]);

    const events = [...productionEvents, ...deliveryEvents, ...purchaseEvents].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return {
      from: this.toIsoDate(from),
      to: this.toIsoDate(to),
      total: events.length,
      events,
    };
  }

  private resolvePlanningRange(fromRaw?: string, toRaw?: string) {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15);
    const defaultTo = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 90,
      23,
      59,
      59,
      999,
    );

    const parsedFrom = this.parseDateOnly(fromRaw) ?? defaultFrom;
    const parsedTo = this.parseDateOnly(toRaw, true) ?? defaultTo;

    if (parsedFrom.getTime() > parsedTo.getTime()) {
      return { from: defaultFrom, to: defaultTo };
    }

    return { from: parsedFrom, to: parsedTo };
  }

  private resolvePlanningTypes(typesRaw?: string): Set<PlanningEventType> {
    if (!typesRaw?.trim()) {
      return new Set<PlanningEventType>(['PRODUCTION', 'DELIVERY', 'PURCHASE']);
    }

    const parsed = typesRaw
      .split(',')
      .map((part) => part.trim().toUpperCase())
      .filter((part): part is PlanningEventType => {
        return part === 'PRODUCTION' || part === 'DELIVERY' || part === 'PURCHASE';
      });

    if (parsed.length === 0) {
      return new Set<PlanningEventType>(['PRODUCTION', 'DELIVERY', 'PURCHASE']);
    }

    return new Set<PlanningEventType>(parsed);
  }

  private async loadProductionCalendarEvents(
    from: Date,
    to: Date,
  ): Promise<PlanningCalendarEvent[]> {
    const orders = await this.prisma.productionOrder.findMany({
      where: {
        OR: [
          { startDate: { gte: from, lte: to } },
          { endDate: { gte: from, lte: to } },
        ],
      },
      orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }],
      select: {
        id: true,
        orderNumber: true,
        product: { select: { name: true } },
        quantity: true,
        status: true,
        startDate: true,
      },
      take: 500,
    });

    return orders
      .filter((order) => order.startDate)
      .map((order) => ({
        id: `prod-${order.id}`,
        type: 'PRODUCTION' as const,
        title: `${order.orderNumber} - ${order.product.name}`,
        date: (order.startDate as Date).toISOString(),
        status: String(order.status),
        reference: order.orderNumber,
        entityId: order.id,
        entityType: 'productionOrder' as const,
      }));
  }

  private async loadDeliveryCalendarEvents(
    from: Date,
    to: Date,
  ): Promise<PlanningCalendarEvent[]> {
    const deliveries = await this.prisma.delivery.findMany({
      where: {
        eta: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { eta: 'asc' },
      select: {
        id: true,
        deliveryNumber: true,
        status: true,
        eta: true,
        client: { select: { name: true } },
      },
      take: 500,
    });

    return deliveries
      .filter((delivery) => delivery.eta)
      .map((delivery) => ({
        id: `del-${delivery.id}`,
        type: 'DELIVERY' as const,
        title: `${delivery.deliveryNumber} - ${delivery.client.name}`,
        date: (delivery.eta as Date).toISOString(),
        status: String(delivery.status),
        reference: delivery.deliveryNumber,
        entityId: delivery.id,
        entityType: 'delivery' as const,
      }));
  }

  private async loadPurchaseCalendarEvents(
    from: Date,
    to: Date,
  ): Promise<PlanningCalendarEvent[]> {
    const purchases = await this.prisma.purchaseOrder.findMany({
      where: {
        expectedAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { expectedAt: 'asc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        expectedAt: true,
        supplier: { select: { name: true } },
      },
      take: 500,
    });

    return purchases
      .filter((purchase) => purchase.expectedAt)
      .map((purchase) => ({
        id: `pur-${purchase.id}`,
        type: 'PURCHASE' as const,
        title: `${purchase.orderNumber} - ${purchase.supplier.name}`,
        date: (purchase.expectedAt as Date).toISOString(),
        status: String(purchase.status),
        reference: purchase.orderNumber,
        entityId: purchase.id,
        entityType: 'purchaseOrder' as const,
      }));
  }

  private parseDateOnly(raw?: string, endOfDay: boolean = false) {
    if (!raw?.trim()) {
      return null;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (endOfDay) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }

    return date;
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private startOfToday(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private formatShortDate(date: Date): string {
    return date.toLocaleDateString('fr-FR');
  }

  private async getCompanyCurrency(): Promise<string> {
    const settings = await this.prisma.companySetting.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { defaultCurrency: true },
    });
    return settings?.defaultCurrency ?? DEFAULT_CURRENCY;
  }
}
