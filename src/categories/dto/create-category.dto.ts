import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

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
}
