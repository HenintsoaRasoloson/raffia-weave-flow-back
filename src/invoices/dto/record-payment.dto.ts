import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_MONEY', 'CARD'] as const;

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Montant encaissé (ex: acompte 30%, solde final, etc.)',
    example: 450.0,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({
    enum: PAYMENT_METHODS,
    description: 'Mode de paiement utilisé par le client',
    example: 'BANK_TRANSFER',
  })
  @IsIn([...PAYMENT_METHODS])
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @ApiPropertyOptional({
    description: 'Date du paiement (défaut: maintenant)',
    example: '2026-07-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'Note libre (référence virement, numéro chèque, etc.)' })
  @IsOptional()
  @IsString()
  notes?: string;
}
