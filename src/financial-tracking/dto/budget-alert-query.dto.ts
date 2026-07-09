import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class BudgetAlertQueryDto {
  @ApiPropertyOptional({
    description: 'Debut de periode a analyser. Par defaut: debut du mois courant.',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Fin de periode a analyser. Par defaut: maintenant.',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filtre categorie budgetaire' })
  @IsOptional()
  @IsString()
  ledgerCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Depassement minimal en pourcentage pour declencher une alerte',
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  minVarianceRate?: number = 0;

  @ApiPropertyOptional({
    description: 'Depassement minimal en montant pour declencher une alerte',
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  minVarianceAmount?: number = 0;

  @ApiPropertyOptional({
    description: 'Nombre max de budgets a remonter',
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