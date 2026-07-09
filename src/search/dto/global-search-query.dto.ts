import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { normalizeEnumParam, trimQueryValue } from '../../common/query/search.util';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const SEARCH_ENTITIES = [
  'products',
  'clients',
  'suppliers',
  'components',
  'salesOrders',
  'invoices',
  'deliveries',
  'productionOrders',
  'purchaseOrders',
] as const;

export class GlobalSearchQueryDto {
  @ApiPropertyOptional({
    description: 'Texte de recherche global (header search).',
    example: 'PRO/000188',
  })
  @IsOptional()
  @Transform(({ value }) => trimQueryValue(value))
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    description:
      'Liste d entites ciblees. Valeurs separees par virgules. Exemple: products,invoices,salesOrders',
    example: 'products,invoices,salesOrders',
  })
  @IsOptional()
  @IsString()
  entities?: string;

  @ApiPropertyOptional({
    description: 'Nombre max de resultats par entite.',
    minimum: 1,
    maximum: 25,
    default: 8,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(25)
  limit?: number = 8;

  @ApiPropertyOptional({
    description: 'Filtre de statut (avance).',
    example: 'ACTIVE',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filtre de type (avance).',
    example: 'PROFORMA',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Date debut creation (ISO, avance).',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date fin creation (ISO, avance).',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filtre niveau de reference metier (avance).',
    example: 188,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  referenceLevel?: number;

  @ApiPropertyOptional({ description: 'Filtre client (avance).' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Filtre fournisseur (avance).' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Filtre categorie produit (avance).' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Mode strict sur les references. exact = egalite exacte sur les champs reference.',
    enum: ['contains', 'exact'],
    default: 'contains',
  })
  @IsOptional()
  @IsIn(['contains', 'exact'])
  matchMode?: 'contains' | 'exact' = 'contains';

  static get AllowedEntities() {
    return SEARCH_ENTITIES;
  }
}
