import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { normalizeEnumParam, trimQueryValue } from '../query/search.util';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Recherche textuelle' })
  @IsOptional()
  @Transform(({ value }) => trimQueryValue(value))
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filtre de statut' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filtre de type' })
  @IsOptional()
  @Transform(({ value }) => normalizeEnumParam(value))
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Inclure les variantes dans la liste (false par defaut)',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeVariants?: boolean = false;

  @ApiPropertyOptional({
    description:
      'Niveau de detail des lignes retournees. compact = payload minimum, full = payload complet.',
    enum: ['compact', 'full'],
    default: 'full',
  })
  @IsOptional()
  @IsString()
  @IsIn(['compact', 'full'])
  fields?: 'compact' | 'full' = 'full';
}
