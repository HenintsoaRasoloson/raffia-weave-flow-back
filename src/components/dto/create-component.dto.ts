import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateComponentDto {
  @ApiProperty()
  @IsString()
  ref!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: ['KG', 'M2', 'M', 'PCS', 'BOBBIN'] })
  @IsIn(['KG', 'M2', 'M', 'PCS', 'BOBBIN'])
  unit!: 'KG' | 'M2' | 'M' | 'PCS' | 'BOBBIN';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  stockQty!: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minQty!: number;

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
