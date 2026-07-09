import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateBomItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  variantId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  componentId?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  colorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number | null;
}
