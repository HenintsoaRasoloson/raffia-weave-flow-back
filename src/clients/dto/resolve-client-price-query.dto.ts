import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ResolveClientPriceQueryDto {
  @ApiProperty({ example: 'clx-variant-id' })
  @IsString()
  variantId!: string;

  @ApiPropertyOptional({
    example: 'clx-product-id',
    description: 'Optionnel; derive de la variante si omis',
  })
  @IsOptional()
  @IsString()
  productId?: string;
}
