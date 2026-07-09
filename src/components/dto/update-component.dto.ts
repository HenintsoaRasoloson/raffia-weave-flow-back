import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateComponentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ref?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['KG', 'M2', 'M', 'PCS', 'BOBBIN'] })
  @IsOptional()
  @IsIn(['KG', 'M2', 'M', 'PCS', 'BOBBIN'])
  unit?: 'KG' | 'M2' | 'M' | 'PCS' | 'BOBBIN';

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;
}
