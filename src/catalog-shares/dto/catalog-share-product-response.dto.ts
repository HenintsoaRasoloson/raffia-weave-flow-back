import { ApiProperty } from '@nestjs/swagger';

export class CatalogShareProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty({ required: false })
  productRef?: string;

  @ApiProperty({ required: false })
  productName?: string;

  @ApiProperty({ required: false })
  productBasePrice?: string;
}