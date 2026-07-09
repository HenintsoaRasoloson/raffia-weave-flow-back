import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BomItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  productId!: string;

  @ApiPropertyOptional()
  variantId?: string;

  @ApiProperty()
  componentId!: string;

  @ApiPropertyOptional()
  colorId?: string;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional()
  unitCost?: number;
}
