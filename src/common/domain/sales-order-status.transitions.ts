import type { UpdateSalesOrderStatusDto } from '../../sales-orders/dto/update-sales-order-status.dto';

export type SalesOrderStatusValue = UpdateSalesOrderStatusDto['status'];

export const SALES_ORDER_STATUS_TRANSITIONS: Record<
  SalesOrderStatusValue,
  SalesOrderStatusValue[]
> = {
  QUOTE: ['TO_PROCESS', 'CANCELLED'],
  TO_PROCESS: ['IN_PRODUCTION', 'PREPARING', 'CANCELLED'],
  IN_PRODUCTION: ['PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['INVOICED'],
  INVOICED: [],
  CANCELLED: [],
};

export const SALES_ORDER_IN_PROGRESS_STATUSES: SalesOrderStatusValue[] = [
  'TO_PROCESS',
  'IN_PRODUCTION',
  'PREPARING',
  'SHIPPED',
];
