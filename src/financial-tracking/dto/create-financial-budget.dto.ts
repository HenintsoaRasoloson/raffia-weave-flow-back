import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

const BUDGET_DIRECTIONS = ['INCOME', 'EXPENSE'] as const;

export class CreateFinancialBudgetDto {
  @ApiProperty({ example: 'Budget logistique Q3' })
  @IsString()
  @Length(2, 160)
  label!: string;

  @ApiProperty({ enum: BUDGET_DIRECTIONS, example: 'EXPENSE' })
  @IsIn([...BUDGET_DIRECTIONS])
  direction!: (typeof BUDGET_DIRECTIONS)[number];

  @ApiProperty({ example: 12000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'EUR', default: 'EUR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @IsDateString()
  periodStart!: string;

  @ApiProperty({ example: '2026-09-30T23:59:59.999Z' })
  @IsDateString()
  periodEnd!: string;

  @ApiPropertyOptional({ description: 'Categorie de suivi associee' })
  @IsOptional()
  @IsString()
  ledgerCategoryId?: string;

  @ApiPropertyOptional({ description: 'Client cible si budget specifique client' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Fournisseur cible si budget specifique fournisseur' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Notes de cadrage' })
  @IsOptional()
  @IsString()
  notes?: string;
}