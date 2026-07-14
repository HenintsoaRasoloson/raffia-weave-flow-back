import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpsertClientVariantPriceItemDto {
  @ApiProperty({ example: 'clx-product-id' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 'clx-variant-id' })
  @IsString()
  variantId!: string;

  @ApiProperty({ example: 75.5, description: 'Prix HT negocie pour cette variante' })
  @IsNumber()
  @Min(0)
  agreedPriceHt!: number;

  @ApiPropertyOptional({ example: 'Accord saison hiver 2026' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertClientVariantPricesDto {
  @ApiProperty({ type: [UpsertClientVariantPriceItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertClientVariantPriceItemDto)
  prices!: UpsertClientVariantPriceItemDto[];
}

export class ClientVariantPriceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientId!: string;

  @ApiProperty()
  productId!: string;

  @ApiProperty()
  variantId!: string;

  @ApiProperty({ example: 75.5 })
  agreedPriceHt!: number;

  @ApiPropertyOptional()
  notes?: string | null;
}
