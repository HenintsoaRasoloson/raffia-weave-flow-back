import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvoiceItemDto {
  @ApiProperty({ example: 'Cabas Madagascar - Terracotta' })
  description!: string;

  @ApiProperty({ example: 40 })
  quantity!: number;

  @ApiProperty({ example: 89 })
  unitPriceHt!: number;

  @ApiPropertyOptional({ example: 20 })
  taxRate?: number;

  @ApiPropertyOptional({ example: 'clx-sales-order-item-id' })
  salesOrderItemId?: string;

  @ApiPropertyOptional({ example: 'clx-product-id' })
  productId?: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  variantId?: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'FAC-2026-0421' })
  invoiceNumber!: string;

  @ApiProperty({ example: 'FINAL', enum: ['PROFORMA', 'DEPOSIT', 'INTERMEDIATE', 'FINAL', 'CREDIT_NOTE'] })
  type!: 'PROFORMA' | 'DEPOSIT' | 'INTERMEDIATE' | 'FINAL' | 'CREDIT_NOTE';

  @ApiPropertyOptional({ example: 'ISSUED', enum: ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'] })
  status?:
    | 'DRAFT'
    | 'ISSUED'
    | 'SENT'
    | 'PAID'
    | 'PARTIALLY_PAID'
    | 'OVERDUE'
    | 'CANCELLED';

  @ApiProperty({ example: 'clx-client-id' })
  clientId!: string;

  @ApiPropertyOptional({ example: 'clx-sales-order-id' })
  salesOrderId?: string;

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  issueDate!: string;

  @ApiPropertyOptional({ example: '2026-10-18T00:00:00.000Z' })
  dueDate?: string;

  @ApiPropertyOptional({ type: [CreateInvoiceItemDto] })
  items?: CreateInvoiceItemDto[];

  @ApiPropertyOptional({ example: 'EUR' })
  currency?: string;

  @ApiPropertyOptional({ example: 'Facture finale collection hiver' })
  notes?: string;
}
