import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_MONEY', 'CARD'] as const;

export class RecordPurchaseOrderPaymentDto {
  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PAYMENT_METHODS, example: 'BANK_TRANSFER' })
  @IsIn([...PAYMENT_METHODS])
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional({ example: '2026-07-10T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: 'Virement SG 2026-07-10' })
  @IsOptional()
  @IsString()
  notes?: string;
}