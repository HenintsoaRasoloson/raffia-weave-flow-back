import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSalesOrderItemDto {
  @ApiProperty({ example: 'Cabas Madagascar - Terracotta' })
  description!: string;

  @ApiProperty({ example: 40 })
  quantity!: number;

  @ApiProperty({ example: 89 })
  unitPriceHt!: number;

  @ApiPropertyOptional({ example: 20 })
  taxRate?: number;

  @ApiPropertyOptional({ example: 'clx-product-id' })
  productId?: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  variantId?: string;
}

export class CreateSalesOrderDto {
  @ApiProperty({ example: 'CMD-2410-0188' })
  orderNumber!: string;

  @ApiProperty({ example: 'clx-client-id' })
  clientId!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  orderType!: 'B2B' | 'B2C';

  @ApiPropertyOptional({ example: 'TO_PROCESS', enum: ['QUOTE', 'TO_PROCESS', 'IN_PRODUCTION', 'PREPARING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'CANCELLED'] })
  status?:
    | 'QUOTE'
    | 'TO_PROCESS'
    | 'IN_PRODUCTION'
    | 'PREPARING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'INVOICED'
    | 'CANCELLED';

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  orderDate!: string;

  @ApiPropertyOptional({ example: 20 })
  taxRate?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  currency?: string;

  @ApiPropertyOptional({ type: [CreateSalesOrderItemDto] })
  items?: CreateSalesOrderItemDto[];

  @ApiPropertyOptional({ example: 'Commande collection hiver' })
  notes?: string;
}
