import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { normalizeEnumParam, trimQueryValue } from '../query/search.util';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const LIST_SORT_ORDERS = ['asc', 'desc'] as const;
const LIST_FIELD_MODES = ['compact', 'full'] as const;

export class ListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Recherche textuelle' })
  @IsOptional()
  @Transform(({ value }) => trimQueryValue(value))
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtre de statut' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filtre de type / origine / role selon le module' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Date debut (ISO). Champ cible selon le module (createdAt, orderDate, issueDate...).',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date fin (ISO). Champ cible selon le module (createdAt, orderDate, issueDate...).',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filtre client (avance)' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({
    description:
      'Filtre propriété produit (COMPANY = catalogue, CLIENT = modèle client). Utilisé avec clientId = ownerClientId pour les modèles d\'un client.',
    enum: ['COMPANY', 'CLIENT'],
  })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsIn(['COMPANY', 'CLIENT'])
  ownership?: 'COMPANY' | 'CLIENT';

  @ApiPropertyOptional({ description: 'Filtre fournisseur (avance)' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Filtre categorie produit (avance)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filtre produit (avance)' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Filtre commande de vente (avance)' })
  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @ApiPropertyOptional({ description: 'Filtre composant / matiere (avance)' })
  @IsOptional()
  @IsString()
  componentId?: string;

  @ApiPropertyOptional({
    description: 'Filtre actif (ex. couleurs). true/false.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Champ de tri whitelisté côté service (ex. createdAt, name, orderDate).',
  })
  @IsOptional()
  @Transform(({ value }) => trimQueryValue(value))
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sens de tri',
    enum: LIST_SORT_ORDERS,
    default: 'desc',
  })
  @IsOptional()
  @IsIn([...LIST_SORT_ORDERS])
  sortOrder?: (typeof LIST_SORT_ORDERS)[number] = 'desc';

  @ApiPropertyOptional({
    description: 'Inclure les variantes dans la liste (false par defaut)',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeVariants?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Niveau de detail des lignes retournees. compact = payload minimum, full = payload complet.',
    enum: LIST_FIELD_MODES,
    default: 'full',
  })
  @IsOptional()
  @IsString()
  @IsIn([...LIST_FIELD_MODES])
  fields?: (typeof LIST_FIELD_MODES)[number] = 'full';
}
