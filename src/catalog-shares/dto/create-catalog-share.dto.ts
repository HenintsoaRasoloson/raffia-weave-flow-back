import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
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

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'REVOKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'REVOKED'])
  status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}
