import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateCatalogShareDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  clientId?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Date d’expiration du lien public (null pour retirer)',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example: 10,
    description:
      'Nombre max de consultations publiques. Null = illimité / retirer la limite.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxViewCount?: number | null;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'REVOKED'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'EXPIRED', 'REVOKED'])
  status?: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}