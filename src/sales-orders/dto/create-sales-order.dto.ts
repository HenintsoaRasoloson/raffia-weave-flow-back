import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateProductDto } from '../../products/dto/create-product.dto';

/** Nouveau modèle client créé à la volée lors de la commande (ownership forcé CLIENT). */
export class CreateOrderClientProductDto extends OmitType(CreateProductDto, [
  'ownership',
  'ownerClientId',
] as const) {}

export class CreateSalesOrderItemDto {
  @ApiProperty({ example: 'Cabas Madagascar - Terracotta' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: 89,
    description:
      'Prix HT manuel. Si omis: B2C = prix catalogue / basePrice, B2B = accord variante (sinon erreur: fournir ce champ).',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPriceHt?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({
    example: 'clx-product-id',
    description:
      'Produit entreprise (COMPANY) ou modèle client (CLIENT) du même client que la commande. Incompatible avec newProduct.',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: 'clx-variant-id' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({
    type: CreateOrderClientProductDto,
    description:
      'Crée un nouveau modèle propriété du client de la commande (hors catalogue). Incompatible avec productId.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderClientProductDto)
  newProduct?: CreateOrderClientProductDto;
}

export class CreateSalesOrderDto {
  @ApiPropertyOptional({
    example: 'CMD/000188',
    description:
      'Reference commande. Si absente, elle est generee automatiquement.',
  })
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @ApiProperty({ example: 'clx-client-id' })
  @IsString()
  clientId!: string;

  @ApiPropertyOptional({
    example: 'B2B',
    enum: ['B2B', 'B2C'],
    description:
      'Si omis, deduit du type du client. Si fourni, doit correspondre au type client.',
  })
  @IsOptional()
  @IsIn(['B2B', 'B2C'])
  orderType?: 'B2B' | 'B2C';

  @ApiPropertyOptional({ example: 'TO_PROCESS', enum: ['QUOTE', 'TO_PROCESS', 'IN_PRODUCTION', 'PREPARING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'CANCELLED'] })
  @IsOptional()
  @IsIn([
    'QUOTE',
    'TO_PROCESS',
    'IN_PRODUCTION',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'INVOICED',
    'CANCELLED',
  ])
  status?:
    | 'QUOTE'
    | 'TO_PROCESS'
    | 'IN_PRODUCTION'
    | 'PREPARING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'INVOICED'
    | 'CANCELLED';

  @ApiProperty({ example: '2026-09-18T00:00:00.000Z' })
  @IsDateString()
  orderDate!: string;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [CreateSalesOrderItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderItemDto)
  items?: CreateSalesOrderItemDto[];

  @ApiPropertyOptional({ example: 'Commande collection hiver' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description:
      'Si true, le passage en IN_PRODUCTION est bloqué tant que le BAT n\'est pas approuvé.',
  })
  @IsOptional()
  @IsBoolean()
  batRequired?: boolean;
}
