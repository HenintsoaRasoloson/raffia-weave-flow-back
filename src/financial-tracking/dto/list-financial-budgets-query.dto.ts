import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListFinancialBudgetsQueryDto {
  @ApiPropertyOptional({ description: 'Debut de periode filtre' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fin de periode filtre' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filtre categorie' })
  @IsOptional()
  @IsString()
  ledgerCategoryId?: string;

  @ApiPropertyOptional({ description: 'Filtre client' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filtre fournisseur' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}