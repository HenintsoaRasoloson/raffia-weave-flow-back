import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'RAF-CAB-001' })
  @IsString()
  ref!: string;

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
}
