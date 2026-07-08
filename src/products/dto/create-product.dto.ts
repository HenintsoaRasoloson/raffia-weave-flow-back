import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'RAF-CAB-001' })
  ref!: string;

  @ApiProperty({ example: 'Cabas Madagascar' })
  name!: string;

  @ApiProperty({ example: 'clx-category-id' })
  categoryId!: string;

  @ApiProperty({ example: 89.0 })
  basePrice!: number;

  @ApiPropertyOptional({ example: 28 })
  stockOnHand?: number;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['ACTIVE', 'LOW_STOCK', 'OUT_OF_STOCK', 'ARCHIVED'] })
  status?: 'ACTIVE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'ARCHIVED';

  @ApiPropertyOptional({ example: 'Produit iconique atelier' })
  description?: string;
}
