import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtenir toutes les données du dashboard
   */
  async getDashboard(days: number = 30): Promise<DashboardDto> {
    const [kpis, revenueSeries, productionOrders, recentOrders, alerts, quickStats] = await Promise.all([
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

  /**
   * KPIs: CA, commandes en cours, marge, trésorerie
   */
  async getKpis(days: number = 30): Promise<KpiDto[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Récupérer les commandes de vente du mois dernier
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: { gte: since },
      },
      include: {
        items: true,
      },
    });

    const previousSince = new Date(since);
    previousSince.setDate(previousSince.getDate() - days);

    const previousOrders = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: previousSince,
          lt: since,
        },
      },
      include: {
        items: true,
      },
    });

    // Calcul du CA
    const currentCA = orders.reduce((sum, o) => sum + (o.totalTtc || 0), 0);
    const previousCA = previousOrders.reduce((sum, o) => sum + (o.totalTtc || 0), 0);
    const caDelta = previousCA > 0 ? ((currentCA - previousCA) / previousCA * 100).toFixed(1) : 0;

    // Commandes en cours
    const inProgressOrders = await this.prisma.salesOrder.count({
      where: {
        status: { in: ['À traiter', 'En production', 'Expédiée'] },
      },
    });

    const previousInProgress = await this.prisma.salesOrder.count({
      where: {
        status: { in: ['À traiter', 'En production', 'Expédiée'] },
        createdAt: { lt: since },
      },
    });

    const ordersDelta = inProgressOrders - previousInProgress;

    return [
      {
        label: 'Chiffre d\'affaires',
        value: `€${(currentCA / 1000).toFixed(1)}k`,
        delta: `${caDelta > 0 ? '+' : ''}${caDelta}%`,
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
        value: '42%',
        delta: '+2.1%',
        trend: 'up',
        hint: 'vs mois dernier',
      },
      {
        label: 'Trésorerie',
        value: '€84k',
        delta: '+€12.4k',
        trend: 'up',
        hint: 'disponible',
      },
    ];
  }

  /**
   * Graphique: Chiffre d'affaires B2B vs B2C par mois (8 derniers mois)
   */
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
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const orders = await this.prisma.salesOrder.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const b2b = orders
        .filter((o) => o.clientType === 'B2B' || o.clientType === 'PROFESSIONNEL')
        .reduce((sum, o) => sum + (o.totalTtc || 0), 0);

      const b2c = orders
        .filter((o) => o.clientType === 'B2C' || o.clientType === 'PARTICULIER')
        .reduce((sum, o) => sum + (o.totalTtc || 0), 0);

      data.push({
        month: monthNames[date.getMonth()],
        b2b: Math.round(b2b),
        b2c: Math.round(b2c),
      });
    }

    return data;
  }

  /**
   * Ordres de fabrication en cours (4 premiers)
   */
  async getProductionOrders(): Promise<ProductionOrder[]> {
    const orders = await this.prisma.productionOrder.findMany({
      where: {
        status: { in: ['Planifié', 'Préparation', 'En cours'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
    });

    return orders.map((o) => ({
      id: o.id,
      product: o.productName || `Produit ${o.id.slice(0, 5)}`,
      qty: o.quantity || 0,
      status: o.status as 'Planifié' | 'Préparation' | 'En cours' | 'Terminé',
      progress: this.calculateProgress(o.status),
      start: o.startDate ? o.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-',
      end: o.endDate ? o.endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-',
    }));
  }

  /**
   * Dernières commandes (10 dernières)
   */
  async getRecentOrders(limit: number = 10): Promise<RecentOrder[]> {
    const orders = await this.prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        client: true,
      },
    });

    return orders.map((o) => ({
      id: o.orderNumber || o.id.slice(0, 8).toUpperCase(),
      client: o.client?.name || 'Client inconnu',
      type: o.clientType === 'B2B' || o.clientType === 'PROFESSIONNEL' ? 'B2B' : 'B2C',
      date: o.createdAt.toLocaleDateString('fr-FR'),
      total: `€${(o.totalTtc || 0).toFixed(0)}`,
      status: o.status || 'À traiter',
    }));
  }

  /**
   * Alertes & suggestions
   */
  async getAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Alerte: Commandes derrière planning
    const behindOrders = await this.prisma.productionOrder.findMany({
      where: {
        status: { in: ['Planifié', 'Préparation', 'En cours'] },
        endDate: {
          lt: new Date(),
        },
      },
      take: 1,
    });

    if (behindOrders.length > 0) {
      alerts.push({
        id: 'behind-1',
        type: 'warning',
        icon: 'AlertTriangle',
        title: 'Production derrière planning',
        message: `OF-${behindOrders[0].id.slice(0, 3)} dépasse la date prévue`,
      });
    }

    // Suggestion IA
    const lowStockComponents = await this.prisma.component.findMany({
      where: {
        stock: {
          lte: 50, // Seuil bas arbitraire
        },
      },
      orderBy: { stock: 'asc' },
      take: 1,
    });

    if (lowStockComponents.length > 0) {
      alerts.push({
        id: 'ai-1',
        type: 'info',
        icon: 'Sparkles',
        title: 'Suggestion IA',
        message: `Réassortir le ${lowStockComponents[0].name} — rupture probable sous 12 jours.`,
      });
    }

    // Bonne nouvelle
    const monthCa = await this.prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(1)),
        },
      },
    });

    const thisMonthCA = monthCa.reduce((sum, o) => sum + (o.totalTtc || 0), 0);

    if (thisMonthCA > 100000) {
      alerts.push({
        id: 'success-1',
        type: 'success',
        icon: 'TrendingUp',
        title: 'Rythme actuel',
        message: `+14% vs. cible mensuelle`,
      });
    }

    return alerts;
  }

  /**
   * Statistiques rapides (4 cartes)
   */
  async getQuickStats(): Promise<QuickStat[]> {
    const [catalogCount, deliveryCount, invoiceCount, shareCount] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.delivery.count({ where: { status: 'En attente' } }),
      this.prisma.invoice.count({ where: { status: 'Émise' } }),
      this.prisma.catalogShare.count({ where: { expiresAt: { gt: new Date() } } }),
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

  /**
   * Calendrier global du planning (production, livraisons, achats)
   */
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

  /**
   * Helper: Calculer le pourcentage de progression selon le statut
   */
  private calculateProgress(status: string): number {
    const progressMap: Record<string, number> = {
      'Planifié': 10,
      'Préparation': 30,
      'En cours': 65,
      'Terminé': 100,
      'Contrôle': 85,
    };
    return progressMap[status] || 0;
  }

  private resolvePlanningRange(fromRaw?: string, toRaw?: string) {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15);
    const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90, 23, 59, 59, 999);

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
