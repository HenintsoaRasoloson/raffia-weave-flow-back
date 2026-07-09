import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReferenceLookupQueryDto {
  @ApiPropertyOptional({
    description: 'Niveau de reference numerique (ex: 188).',
    example: 188,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({
    description:
      'Reference complete (ex: CMD/000188, PRO/000188, LIV/000188...).',
    example: 'PRO/000188',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,4}\/\d{6}$/)
  ref?: string;
}
