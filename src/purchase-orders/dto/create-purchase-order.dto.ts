import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CreatePurchaseOrderItemDto } from './create-purchase-order-item.dto';

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  orderNumber!: string;

  @ApiProperty()
  @IsString()
  supplierId!: string;

  @ApiProperty()
  @IsDateString()
  orderDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiPropertyOptional({ enum: ['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'])
  status?: 'DRAFT' | 'CONFIRMED' | 'IN_TRANSIT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
}
