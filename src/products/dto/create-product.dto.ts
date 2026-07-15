import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateProductVariantDto {
  @ApiPropertyOptional({ enum: ['PM', 'MM', 'GM'], example: 'GM' })
  @IsOptional()
  @IsIn(['PM', 'MM', 'GM'])
  size?: 'PM' | 'MM' | 'GM';

  @ApiPropertyOptional({ example: 'clx-color-id' })
  @IsOptional()
  @IsString()
  colorId?: string;

  @ApiPropertyOptional({ example: '50x35x12 cm' })
  @IsOptional()
  @IsString()
  defaultDimensions?: string;

  @ApiPropertyOptional({ example: 'S-123123-GM-NAT' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockOnHand?: number;

  @ApiPropertyOptional({ example: 95.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 'Grand modele naturel' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateProductDto {
  @ApiPropertyOptional({
    example: 'S/123123',
    description:
      'Reference produit. Si absente, elle est generee automatiquement depuis la categorie.',
  })
  @IsOptional()
  @IsString()
  ref?: string;

  @ApiProperty({ example: 'Cabas Madagascar' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'clx-category-id' })
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: 89.0 })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockOnHand?: number;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'ARCHIVED'])
  status?: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ARCHIVED';

  @ApiPropertyOptional({ example: 'Produit iconique atelier' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'COMPANY',
    enum: ['COMPANY', 'CLIENT'],
    default: 'COMPANY',
    description:
      'COMPANY = produit entreprise (catalogue). CLIENT = modèle privé d\'un client (hors catalogue).',
  })
  @IsOptional()
  @IsIn(['COMPANY', 'CLIENT'])
  ownership?: 'COMPANY' | 'CLIENT';

  @ApiPropertyOptional({
    example: 'clx-client-id',
    description: 'Obligatoire si ownership = CLIENT. Doit être null/omis si COMPANY.',
  })
  @IsOptional()
  @IsString()
  ownerClientId?: string;

  @ApiPropertyOptional({
    type: [CreateProductVariantDto],
    description:
      'Variantes du produit (taille PM/MM/GM, coloris et dimensions par taille).',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
