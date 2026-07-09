import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Sac' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: 'S',
    description: 'Code court utilise pour les references produit (ex: S/123123).',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{1,10}$/)
  code?: string;

  @ApiPropertyOptional({
    example: 'sac',
    description: 'Slug URL-friendly. Si absent, il sera derive du nom.',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 6,
    description:
      'Nombre de chiffres de la partie numerique de la reference (ex: S/123123 => 6).',
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  refSequenceLength?: number;
}
