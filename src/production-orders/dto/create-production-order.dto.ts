import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductionOrderDto {
  @ApiProperty({ example: 'OF-2410-014' })
  orderNumber!: string;

  @ApiProperty({ example: 'clx-product-id' })
  productId!: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  variantId?: string;

  @ApiPropertyOptional({ example: 'clx-sales-order-id' })
  salesOrderId?: string;

  @ApiPropertyOptional({ example: 'clx-sales-order-item-id' })
  salesOrderItemId?: string;

  @ApiProperty({ example: 60 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'PLANNED', enum: ['PLANNED', 'PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  status?: 'PLANNED' | 'PREPARATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional({ example: '2026-09-12T00:00:00.000Z' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-24T00:00:00.000Z' })
  endDate?: string;
}
