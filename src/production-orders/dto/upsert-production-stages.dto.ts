import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const PRODUCTION_STAGE_VALUES = [
  'PREPARATION',
  'CROCHET',
  'WEAVING',
  'LEATHER',
  'FINISHING',
  'QUALITY_CONTROL',
] as const;

export type ProductionStageValue = (typeof PRODUCTION_STAGE_VALUES)[number];

export class UpsertProductionStageItemDto {
  @ApiProperty({
    enum: PRODUCTION_STAGE_VALUES,
    example: 'PREPARATION',
  })
  @IsIn([...PRODUCTION_STAGE_VALUES])
  stage!: ProductionStageValue;

  @ApiPropertyOptional({ example: '2026-07-02T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @ApiPropertyOptional({ example: '2026-07-10T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @ApiPropertyOptional({ example: '2026-07-02T08:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  actualStart?: string;

  @ApiPropertyOptional({ example: '2026-07-09T17:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  actualEnd?: string;

  @ApiPropertyOptional({ example: 40, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class UpsertProductionStagesDto {
  @ApiProperty({ type: [UpsertProductionStageItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpsertProductionStageItemDto)
  stages!: UpsertProductionStageItemDto[];
}
