import { ApiProperty } from '@nestjs/swagger';
import { CatalogShareProductResponseDto } from './catalog-share-product-response.dto';

export class CatalogShareResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false, nullable: true })
  clientId: string | null;

  @ApiProperty({
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
  })
  status: string;

  @ApiProperty({ required: false, nullable: true })
  expiresAt: Date | null;

  @ApiProperty()
  viewCount: number;

  @ApiProperty({ required: false, nullable: true })
  lastViewedAt: Date | null;

  @ApiProperty({ type: () => [CatalogShareProductResponseDto] })
  products: CatalogShareProductResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}