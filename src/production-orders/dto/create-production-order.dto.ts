import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductionOrderDto {
  @ApiProperty({ example: 'OF-2410-014' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'clx-product-id' })
  @IsString()
  productId!: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 'clx-sales-order-id' })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiPropertyOptional({ example: 'clx-sales-order-item-id' })
  @IsOptional()
  @IsString()
  salesOrderItemId?: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ example: 'PLANNED', enum: ['PLANNED', 'PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['PLANNED', 'PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNED' | 'PREPARATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional({ example: '2026-09-12T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-24T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
