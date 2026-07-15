import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Contrats OpenAPI pour GET /reference-lookup.
 * Les agrégats principaux sont typés ; les sous-collections liées sont documentées
 * comme objets métier génériques (relations Prisma enrichies à la runtime).
 */

export class ReferenceLookupEntitySummaryDto {
  @ApiProperty({ example: 'so123' })
  id!: string;

  @ApiPropertyOptional({ example: 188, nullable: true })
  referenceLevel?: number | null;
}

export class ReferenceLookupSalesOrderDto extends ReferenceLookupEntitySummaryDto {
  @ApiProperty({ example: 'CMD/000188' })
  orderNumber!: string;

  @ApiProperty({ example: 'TO_PROCESS' })
  status!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  orderType!: string;

  @ApiPropertyOptional({
    description: 'Client associé (include Prisma)',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  client?: object | null;
}

export class ReferenceLookupInvoiceDto extends ReferenceLookupEntitySummaryDto {
  @ApiProperty({ example: 'FAC/000188' })
  invoiceNumber!: string;

  @ApiProperty({ example: 'PROFORMA' })
  type!: string;

  @ApiProperty({ example: 'DRAFT' })
  status!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  client?: object | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  salesOrder?: object | null;
}

export class ReferenceLookupDeliveryDto extends ReferenceLookupEntitySummaryDto {
  @ApiProperty({ example: 'LIV/000188' })
  deliveryNumber!: string;

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  client?: object | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  salesOrder?: object | null;
}

export class ReferenceLookupProductionOrderDto extends ReferenceLookupEntitySummaryDto {
  @ApiProperty({ example: 'OF/000188' })
  orderNumber!: string;

  @ApiProperty({ example: 'PLANNED' })
  status!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  product?: object | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  variant?: object | null;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  salesOrder?: object | null;
}

export class ReferenceLookupPurchaseOrderDto extends ReferenceLookupEntitySummaryDto {
  @ApiProperty({ example: 'ACH/000188' })
  orderNumber!: string;

  @ApiProperty({ example: 'DRAFT' })
  status!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, nullable: true })
  supplier?: object | null;
}

export class ReferenceLookupRelatedDto {
  @ApiProperty({
    description: 'Lignes de commande au même niveau de référence',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  salesOrderItems!: object[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  batDocuments!: object[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  invoiceItems!: object[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  invoicePayments!: object[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  invoiceDocuments!: object[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  purchaseOrderItems!: object[];

  @ApiProperty({
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  productionSteps!: object[];
}

export class ReferenceLookupResponseDto {
  @ApiProperty({
    description: 'Niveau de référence résolu',
    example: 188,
  })
  level!: number;

  @ApiProperty({
    description: 'Critère ayant servi à résoudre le niveau',
    enum: ['level', 'ref'],
    example: 'ref',
  })
  matchedBy!: 'level' | 'ref';

  @ApiPropertyOptional({
    description: 'Référence source normalisée si fournie',
    example: 'CMD/000188',
  })
  sourceRef?: string;

  @ApiPropertyOptional({
    description: 'Commande de vente au niveau demandé, ou null',
    type: ReferenceLookupSalesOrderDto,
    nullable: true,
  })
  salesOrder!: ReferenceLookupSalesOrderDto | null;

  @ApiProperty({ type: [ReferenceLookupInvoiceDto] })
  invoices!: ReferenceLookupInvoiceDto[];

  @ApiProperty({ type: [ReferenceLookupDeliveryDto] })
  deliveries!: ReferenceLookupDeliveryDto[];

  @ApiProperty({ type: [ReferenceLookupProductionOrderDto] })
  productionOrders!: ReferenceLookupProductionOrderDto[];

  @ApiProperty({ type: [ReferenceLookupPurchaseOrderDto] })
  purchaseOrders!: ReferenceLookupPurchaseOrderDto[];

  @ApiProperty({ type: ReferenceLookupRelatedDto })
  related!: ReferenceLookupRelatedDto;
}
