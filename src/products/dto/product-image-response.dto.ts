import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const COMPRESSION_ALGOS = ['NONE', 'GZIP'] as const;

export class ProductImageResponseDto {
  @ApiProperty({ example: 'img123' })
  id!: string;

  @ApiProperty({ example: 'prd123' })
  productId!: string;

  @ApiProperty({ example: 'cabas-front.jpg' })
  originalName!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiPropertyOptional({
    description: 'Bucket MinIO quand le stockage objet est actif',
    nullable: true,
    example: 'raffia-ged-raw',
  })
  bucket?: string | null;

  @ApiPropertyOptional({
    description: 'Clé objet MinIO',
    nullable: true,
    example: 'admin/product/prd123/image/v1/cabas-front.jpg',
  })
  objectKey?: string | null;

  @ApiPropertyOptional({
    description: 'Chemin disque local (fallback hors MinIO)',
    nullable: true,
  })
  storagePath?: string | null;

  @ApiProperty({
    description: 'Taille originale avant compression (octets)',
    example: 120000,
  })
  originalSize!: number;

  @ApiProperty({
    description: 'Taille stockée après compression éventuelle (octets)',
    example: 80000,
  })
  compressedSize!: number;

  @ApiProperty({
    enum: COMPRESSION_ALGOS,
    example: 'GZIP',
  })
  compressionAlgo!: (typeof COMPRESSION_ALGOS)[number] | string;

  @ApiPropertyOptional({
    description: 'Utilisateur ayant uploadé l’image',
    nullable: true,
    example: 'usr123',
  })
  uploadedById?: string | null;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Version déduite de objectKey / storagePath',
    example: 1,
  })
  version?: number;

  @ApiPropertyOptional({
    description: 'URL relative de lecture décompressée (présent sur findOne produit)',
    example: '/products/prd123/images/img123',
  })
  decompressedUrl?: string;
}

export class ReplaceProductImageResponseDto {
  @ApiProperty({ example: 'img123' })
  replacedImageId!: string;

  @ApiProperty({ example: 'img456' })
  newImageId!: string;

  @ApiProperty({ example: 2 })
  version!: number;

  @ApiProperty({ type: ProductImageResponseDto })
  image!: ProductImageResponseDto;
}

export class DeleteProductImageResponseDto {
  @ApiProperty({ example: 'img123' })
  id!: string;

  @ApiProperty({ example: true })
  deleted!: boolean;
}
