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

export class CreateInvoiceItemDto {
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

  @ApiPropertyOptional({ example: 'clx-sales-order-item-id' })
  @IsOptional()
  @IsString()
  salesOrderItemId?: string;

  @ApiPropertyOptional({ example: 'clx-product-id' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  @IsOptional()
  @IsString()
  variantId?: string;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional({
    example: 'PRO/000188',
    description:
      'Reference facture. Si absente, elle est generee automatiquement selon le type.',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiProperty({ example: 'FINAL', enum: ['PROFORMA', 'DEPOSIT', 'INTERMEDIATE', 'FINAL', 'CREDIT_NOTE'] })
  @IsIn(['PROFORMA', 'DEPOSIT', 'INTERMEDIATE', 'FINAL', 'CREDIT_NOTE'])
  type!: 'PROFORMA' | 'DEPOSIT' | 'INTERMEDIATE' | 'FINAL' | 'CREDIT_NOTE';

  @ApiPropertyOptional({ example: 'ISSUED', enum: ['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'ISSUED', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'])
  status?:
    | 'DRAFT'
    | 'ISSUED'
    | 'SENT'
    | 'PAID'
    | 'PARTIALLY_PAID'
    | 'OVERDUE'
    | 'CANCELLED';

  @ApiProperty({ example: 'clx-client-id' })
  @IsString()
  clientId!: string;

  @ApiPropertyOptional({ example: 'clx-sales-order-id' })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  @IsDateString()
  issueDate!: string;

  @ApiPropertyOptional({ example: '2026-10-18T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ type: [CreateInvoiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items?: CreateInvoiceItemDto[];

  @ApiPropertyOptional({ example: 'MGA', enum: ['MGA', 'EUR'] })
  @IsOptional()
  @IsString()
  @IsIn(['MGA', 'EUR'])
  currency?: string;

  @ApiPropertyOptional({ example: 'Facture finale collection hiver' })
  @IsOptional()
  @IsString()
  notes?: string;
}
