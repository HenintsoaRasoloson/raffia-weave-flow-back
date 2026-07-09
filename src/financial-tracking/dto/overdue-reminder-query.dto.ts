import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class OverdueReminderQueryDto {
  @ApiPropertyOptional({ description: 'Filtre client' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Nombre minimum de jours de retard pour declencher une relance',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  minDaysOverdue?: number = 1;

  @ApiPropertyOptional({
    description: 'Montant restant du minimal pour remonter une facture',
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  minOutstandingAmount?: number = 0;

  @ApiPropertyOptional({
    description: 'Date de reference pour calculer le retard. Par defaut: maintenant.',
  })
  @IsOptional()
  @IsDateString()
  asOf?: string;

  @ApiPropertyOptional({
    description: 'Nombre max de factures a remonter',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}