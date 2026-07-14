import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SALES_ORDER_IN_PROGRESS_STATUSES } from '../common/domain/sales-order-status.transitions';
import { FinancialTrackingService } from '../financial-tracking/financial-tracking.service';
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
} from './dto/dashboard.dto';

type PlanningEventType = 'PRODUCTION' | 'DELIVERY' | 'PURCHASE';

interface PlanningCalendarQuery {
  from?: string;
  to?: string;
  types?: string;
}

const PRODUCTION_ACTIVE_STATUSES = ['PLANNED', 'PREPARATION', 'IN_PROGRESS'] as const;
const DELIVERY_PENDING_STATUSES = ['PLANNED', 'PREPARING'] as const;
const INVOICE_PENDING_STATUSES = ['DRAFT', 'ISSUED'] as const;
const LOW_STOCK_THRESHOLD = 50;

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
  ) {}

  async getDashboard(days: number = 30): Promise<DashboardDto> {
    const [kpis, revenueSeries, productionOrders, recentOrders, alerts, quickStats] =
      await Promise.all([
        this.getKpis(days),
        this.getRevenueChart(8),
        this.getProductionOrders(),
        this.getRecentOrders(10),
        this.getAlerts(),
        this.getQuickStats(),
      ]);

    return {
      kpis,
      revenueSeries,
      productionOrders,
      recentOrders,
      alerts,
      quickStats,
    };
  }

  async getKpis(days: number = 30): Promise<KpiDto[]> {
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
    const caDelta =
      previousCA > 0 ? ((currentCA - previousCA) / previousCA) * 100 : 0;

    const ordersDelta = inProgressOrders - previousInProgress;

    const currentMargin = overview.margins.estimatedMarginRate;
    const previousMargin = previousOverview.margins.estimatedMarginRate;
    const marginDelta = currentMargin - previousMargin;

    const treasury = overview.treasury.trackedBalance;
    const previousTreasury = previousOverview.treasury.trackedBalance;
    const treasuryDelta = treasury - previousTreasury;

    return [
      {
        label: "Chiffre d'affaires",
        value: `€${(currentCA / 1000).toFixed(1)}k`,
        delta: `${caDelta > 0 ? '+' : ''}${caDelta.toFixed(1)}%`,
        trend: caDelta >= 0 ? 'up' : 'down',
        hint: 'vs période précédente',
      },
      {
        label: 'Commandes en cours',
        value: inProgressOrders.toString(),
        delta: `${ordersDelta > 0 ? '+' : ''}${ordersDelta}`,
        trend: ordersDelta >= 0 ? 'up' : 'down',
        hint: 'B2B + B2C',
      },
      {
        label: 'Marge moyenne',
        value: `${currentMargin.toFixed(1)}%`,
        delta: `${marginDelta > 0 ? '+' : ''}${marginDelta.toFixed(1)}%`,
        trend: marginDelta >= 0 ? 'up' : 'down',
        hint: 'vs période précédente',
      },
      {
        label: 'Trésorerie',
        value: `€${(treasury / 1000).toFixed(1)}k`,
        delta: `${treasuryDelta >= 0 ? '+' : ''}€${(treasuryDelta / 1000).toFixed(1)}k`,
        trend: treasuryDelta >= 0 ? 'up' : 'down',
        hint: 'disponible',
      },
    ];
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
    const orders = await this.prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        client: { select: { name: true } },
      },
    });

    return orders.map((order) => ({
      id: order.orderNumber,
      client: order.client?.name ?? 'Client inconnu',
      type: order.orderType,
      date: order.orderDate.toLocaleDateString('fr-FR'),
      total: `€${Number(order.totalTtc ?? 0).toFixed(0)}`,
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
        id: 'behind-1',
        type: 'warning',
        icon: 'AlertTriangle',
        title: 'Production derrière planning',
        message: `${behindOrders[0].orderNumber} dépasse la date prévue`,
      });
    }

    const lowStockComponents = await this.prisma.component.findMany({
      where: {
        stockQty: { lte: LOW_STOCK_THRESHOLD },
      },
      orderBy: { stockQty: 'asc' },
      take: 1,
      select: { name: true, stockQty: true },
    });

    if (lowStockComponents.length > 0) {
      alerts.push({
        id: 'stock-1',
        type: 'info',
        icon: 'Sparkles',
        title: 'Stock bas',
        message: `Réassortir ${lowStockComponents[0].name} — stock actuel: ${Number(lowStockComponents[0].stockQty)}.`,
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
      alerts.push({
        id: 'success-1',
        type: 'success',
        icon: 'TrendingUp',
        title: 'Rythme actuel',
        message: `CA mensuel: €${(thisMonthCA / 1000).toFixed(1)}k`,
      });
    }

    return alerts;
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
}
