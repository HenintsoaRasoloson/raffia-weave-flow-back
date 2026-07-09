import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const MATERIAL_UNITS = ['KG', 'M2', 'M', 'PCS', 'BOBBIN'] as const;
const COMPONENT_ORIGINS = ['PURCHASED', 'MANUFACTURED'] as const;

export class CreateComponentDto {
  @ApiProperty()
  @IsString()
  ref!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: MATERIAL_UNITS })
  @IsIn([...MATERIAL_UNITS])
  unit!: (typeof MATERIAL_UNITS)[number];

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

  @ApiPropertyOptional({
    enum: COMPONENT_ORIGINS,
    description:
      'PURCHASED = acheté à un fournisseur (raphia brut, anneaux métal). ' +
      'MANUFACTURED = fabriqué en interne (plaque de raphia, sangle découpée).',
    default: 'PURCHASED',
  })
  @IsOptional()
  @IsIn([...COMPONENT_ORIGINS])
  origin?: (typeof COMPONENT_ORIGINS)[number];

  @ApiPropertyOptional({ description: 'Requis si origin = PURCHASED' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}
