import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GlobalSearchQueryDto } from './global-search-query.dto';

const SEARCH_ENTITIES = GlobalSearchQueryDto.AllowedEntities;

export type SearchEntityName = (typeof SEARCH_ENTITIES)[number];

export class SearchHitResponseDto {
  @ApiProperty({
    description: 'Entité métier d’origine du hit',
    enum: SEARCH_ENTITIES,
    example: 'products',
  })
  entity!: SearchEntityName;

  @ApiProperty({ example: 'prd123' })
  id!: string;

  @ApiProperty({
    description: 'Libellé principal affiché (nom, numéro de commande, etc.)',
    example: 'Cabas Madagascar',
  })
  label!: string;

  @ApiPropertyOptional({
    description: 'Informations secondaires (email, client, catégorie…)',
    example: 'PRO/000188',
  })
  secondary?: string;

  @ApiPropertyOptional({
    description: 'Référence métier quand disponible',
    example: 'PRO/000188',
  })
  reference?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  status?: string;

  @ApiPropertyOptional({
    description: 'Type métier (ex. B2B, PROFORMA) quand applicable',
    example: 'PROFORMA',
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'Niveau de référence (ex. 188 pour CMD/000188)',
    example: 188,
    nullable: true,
  })
  referenceLevel?: number | null;

  @ApiPropertyOptional({
    description: 'Date de création de l’entité',
    example: '2026-07-01T10:00:00.000Z',
  })
  createdAt?: Date;
}

export class GlobalSearchGroupedResponseDto {
  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  products?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  clients?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  suppliers?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  components?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  salesOrders?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  invoices?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  deliveries?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  productionOrders?: SearchHitResponseDto[];

  @ApiPropertyOptional({ type: [SearchHitResponseDto] })
  purchaseOrders?: SearchHitResponseDto[];
}

export class GlobalSearchResponseDto {
  @ApiProperty({
    description: 'Terme de recherche normalisé utilisé',
    example: 'PRO/000188',
  })
  query!: string;

  @ApiProperty({
    description: 'Entités réellement interrogées',
    isArray: true,
    enum: SEARCH_ENTITIES,
    example: ['products', 'salesOrders'],
  })
  entities!: SearchEntityName[];

  @ApiProperty({
    description: 'Mode de matching appliqué aux références',
    enum: ['contains', 'exact'],
    example: 'contains',
  })
  matchMode!: 'contains' | 'exact';

  @ApiProperty({
    description: 'Durée d’exécution côté serveur (ms)',
    example: 42,
  })
  tookMs!: number;

  @ApiProperty({
    description: 'Nombre total de hits aplatis',
    example: 5,
  })
  total!: number;

  @ApiProperty({
    description: 'Nombre de hits par entité',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { products: 2, salesOrders: 3 },
  })
  counts!: Record<string, number>;

  @ApiProperty({
    description: 'Hits regroupés par entité (clés = entités demandées)',
    type: GlobalSearchGroupedResponseDto,
  })
  grouped!: GlobalSearchGroupedResponseDto;

  @ApiProperty({
    description: 'Hits aplatis, triés par date de création décroissante',
    type: [SearchHitResponseDto],
  })
  results!: SearchHitResponseDto[];
}
