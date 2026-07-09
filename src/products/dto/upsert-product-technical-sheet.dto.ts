import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const TECHNICAL_CATEGORIES = [
  'CROCHET',
  'RAPHIA',
  'LEATHER',
  'ACCESSORY',
  'LINING',
  'HANDLE',
  'HARDWARE',
  'LABEL',
  'PACKAGING',
  'OTHER',
] as const;

const MATERIAL_UNITS = ['KG', 'M2', 'M', 'PCS', 'BOBBIN'] as const;

export class UpsertProductTechnicalSheetElementDto {
  @ApiProperty({ example: 1, description: 'Ordre de l\'élément dans la fiche' })
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiProperty({ example: 'Crochet principal' })
  @IsString()
  @MaxLength(180)
  name!: string;

  @ApiProperty({ enum: TECHNICAL_CATEGORIES, example: 'CROCHET' })
  @IsIn([...TECHNICAL_CATEGORIES])
  category!: (typeof TECHNICAL_CATEGORIES)[number];

  @ApiPropertyOptional({ example: 'Crochet tunisien #3' })
  @IsOptional()
  @IsString()
  componentType?: string;

  @ApiPropertyOptional({ example: 'Raphia naturel premium' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: 'Terracotta' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'L=32cm; H=26cm; P=12cm' })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({ example: 'M' })
  @IsOptional()
  @IsString()
  sizeLabel?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ enum: MATERIAL_UNITS, example: 'PCS' })
  @IsOptional()
  @IsIn([...MATERIAL_UNITS])
  unit?: (typeof MATERIAL_UNITS)[number];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @ApiPropertyOptional({ example: 'Toujours commencer par ce composant en atelier' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpsertProductTechnicalSheetDto {
  @ApiPropertyOptional({ example: 'Fiche Technique Cabas Madagascar - V1' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example:
      '1) Préparer le raphia. 2) Crochet base. 3) Monter les poignées cuir. 4) Contrôle qualité.',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    example:
      'Respecter la tension de crochet sur les 3 premières rangées pour garder la forme du sac.',
  })
  @IsOptional()
  @IsString()
  workshopNotes?: string;

  @ApiProperty({ type: [UpsertProductTechnicalSheetElementDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertProductTechnicalSheetElementDto)
  elements!: UpsertProductTechnicalSheetElementDto[];
}
