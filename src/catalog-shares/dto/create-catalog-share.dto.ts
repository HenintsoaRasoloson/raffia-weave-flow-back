import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCatalogShareDto {
  @ApiProperty({ example: 'Catalogue hiver 2026' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  productIds?: string[];

  @ApiPropertyOptional({
    nullable: true,
    example: '2026-07-24T00:00:00.000Z',
    description: 'Date d’expiration du lien public',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 1,
    description:
      'Nombre max de consultations publiques. Null = illimité.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxViewCount?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'REVOKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'REVOKED'])
  status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}
