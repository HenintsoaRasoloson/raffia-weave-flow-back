import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty({
    description: 'Montant encaissé (ex: acompte 30%, solde final, etc.)',
    example: 450.0,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Date du paiement (défaut: maintenant)',
    example: '2026-07-10T10:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
