import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadProductImagesDto {
  @ApiPropertyOptional({
    example: 'Collection ete 2026',
    description: 'Tag libre applique a toutes les images envoyees',
  })
  @IsOptional()
  @IsString()
  tag?: string;
}
