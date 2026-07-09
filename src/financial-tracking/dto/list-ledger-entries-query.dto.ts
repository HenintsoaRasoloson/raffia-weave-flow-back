import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const LEDGER_ENTRY_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;

export class ListLedgerEntriesQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Recherche texte sur libelle/note' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: LEDGER_ENTRY_TYPES })
  @IsOptional()
  @IsIn([...LEDGER_ENTRY_TYPES])
  type?: (typeof LEDGER_ENTRY_TYPES)[number];

  @ApiPropertyOptional({ description: 'Filtre client' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filtre fournisseur' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Filtre categorie financiere' })
  @IsOptional()
  @IsString()
  ledgerCategoryId?: string;

  @ApiPropertyOptional({ description: 'Date debut (entryDate)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date fin (entryDate)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}