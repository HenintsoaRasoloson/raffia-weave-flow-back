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

const LEDGER_ENTRY_TYPES = ['INCOME', 'EXPENSE', 'TRANSFER'] as const;

export class CreateLedgerEntryDto {
  @ApiProperty({
    description: 'Date de l ecriture de tresorerie',
    example: '2026-07-09T08:30:00.000Z',
  })
  @IsDateString()
  entryDate!: string;

  @ApiProperty({
    description: 'Libelle lisible dans le journal financier',
    example: 'Salaire atelier juin 2026',
  })
  @IsString()
  @Length(2, 160)
  label!: string;

  @ApiProperty({
    description: 'Nature de l ecriture',
    enum: LEDGER_ENTRY_TYPES,
    example: 'EXPENSE',
  })
  @IsIn([...LEDGER_ENTRY_TYPES])
  entryType!: (typeof LEDGER_ENTRY_TYPES)[number];

  @ApiProperty({
    description: 'Montant de l ecriture',
    example: 1250,
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Devise',
    example: 'MGA',
    default: 'MGA',
    enum: ['MGA', 'EUR'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['MGA', 'EUR'])
  currency?: string;

  @ApiPropertyOptional({ description: 'Client rattache a l ecriture' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Fournisseur rattache a l ecriture' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Commande client rattachee' })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiPropertyOptional({ description: 'Facture rattachee' })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiPropertyOptional({ description: 'Commande fournisseur rattachee' })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ description: 'Categorie structurante de suivi financier' })
  @IsOptional()
  @IsString()
  ledgerCategoryId?: string;

  @ApiPropertyOptional({
    description: 'Note libre: reference virement, categorie interne, commentaire',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}