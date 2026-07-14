export const NOTIFICATION_TYPES = {
  SALES_ORDER_CREATED: 'sales_order_created',
  PROFORMA_READY: 'proforma_ready',
  LARGE_PAYMENT_RECEIVED: 'large_payment_received',
  PAYMENT_RECORDED: 'payment_recorded',
  INVOICE_FULLY_PAID: 'invoice_fully_paid',
  PRODUCTION_READY_FOR_DELIVERY: 'production_ready_for_delivery',
  PRODUCTION_COMPLETED: 'production_completed',
  DELIVERY_COMPLETED: 'delivery_completed',
  BUDGET_OVERRUN_DETECTED: 'budget_overrun_detected',
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
