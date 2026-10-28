// src/dashboard/dto/dashboard.dto.ts
export class KpiDto {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  hint: string;
}

export class RevenueSeries {
  month: string;
  b2b: number;
  b2c: number;
}

export class ProductionOrder {
  id: string;
  orderNumber: string;
  product: string;
  qty: number;
  status: 'Planifié' | 'Préparation' | 'En cours' | 'Terminé';
  progress: number;
  start: string;
  end: string;
}

export class RecentOrder {
  id: string;
  orderNumber: string;
  client: string;
  type: 'B2B' | 'B2C';
  date: string;
  total: string;
  status: string;
}

export class Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  icon: 'AlertTriangle' | 'Sparkles' | 'TrendingUp';
  title: string;
  message: string;
  actionUrl?: string;
}

export class QuickStat {
  to: string;
  icon: string;
  label: string;
  hint: string;
}

export type WorkshopQueueItemKind =
  | 'salesOrder'
  | 'productionOrder'
  | 'delivery'
  | 'invoice'
  | 'product'
  | 'component';

export class WorkshopQueueItem {
  id: string;
  kind: WorkshopQueueItemKind;
  title: string;
  subtitle: string;
  status: string;
  meta: string;
  dueDate: string | null;
  overdue: boolean;
  qty: number | null;
  amount: string | null;
}

export class WorkshopQueueLane {
  count: number;
  items: WorkshopQueueItem[];
}

export class WorkshopQueueDto {
  toProcess: WorkshopQueueLane;
  toProduce: WorkshopQueueLane;
  toDeliver: WorkshopQueueLane;
  toCollect: WorkshopQueueLane;
  criticalStock: WorkshopQueueLane;
  productCount: number;
  overdueCount: number;
}

export class PlanningCalendarEvent {
  id: string;
  type: 'PRODUCTION' | 'DELIVERY' | 'PURCHASE';
  title: string;
  date: string;
  status: string;
  reference: string;
  entityId: string;
  entityType: 'productionOrder' | 'delivery' | 'purchaseOrder';
}

export class PlanningCalendarResponse {
  from: string;
  to: string;
  total: number;
  events: PlanningCalendarEvent[];
}

export class DashboardDto {
  kpis: KpiDto[];
  revenueSeries: RevenueSeries[];
  productionOrders: ProductionOrder[];
  recentOrders: RecentOrder[];
  alerts: Alert[];
  quickStats: QuickStat[];
  queue: WorkshopQueueDto;
}
