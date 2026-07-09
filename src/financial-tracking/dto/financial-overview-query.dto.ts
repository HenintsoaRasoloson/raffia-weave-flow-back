import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class FinancialOverviewQueryDto {
  @ApiPropertyOptional({
    description: 'Debut de periode ISO. Par defaut: maintenant - 30 jours',
    example: '2026-06-09T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fin de periode ISO. Par defaut: maintenant',
    example: '2026-07-09T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Client cible pour un suivi financier dedie',
  })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Projection en jours pour les tensions a venir',
    default: 30,
    minimum: 1,
    maximum: 180,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(180)
  horizonDays?: number = 30;
}