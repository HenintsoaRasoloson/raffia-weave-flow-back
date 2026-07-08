import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSalesOrderItemDto {
  @ApiProperty({ example: 'Cabas Madagascar - Terracotta' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 89 })
  @IsNumber()
  @Min(0)
  unitPriceHt!: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'clx-product-id' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class CreateSalesOrderDto {
  @ApiProperty({ example: 'CMD-2410-0188' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'clx-client-id' })
  @IsString()
  clientId!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  @IsIn(['B2B', 'B2C'])
  orderType!: 'B2B' | 'B2C';

  @ApiPropertyOptional({ example: 'TO_PROCESS', enum: ['QUOTE', 'TO_PROCESS', 'IN_PRODUCTION', 'PREPARING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'CANCELLED'] })
  @IsOptional()
  @IsIn([
    'QUOTE',
    'TO_PROCESS',
    'IN_PRODUCTION',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'INVOICED',
    'CANCELLED',
  ])
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
  @IsDateString()
  orderDate!: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [CreateSalesOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items?: CreateSalesOrderItemDto[];

  @ApiPropertyOptional({ example: 'Commande collection hiver' })
  @IsOptional()
  @IsString()
  notes?: string;
}
