import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function emptyToNull({ value }: { value: unknown }) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function trimString({ value }: { value: unknown }) {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateCompanyProfileDto {
  @ApiProperty({ example: 'Camelias SARL' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({ example: '1234567890', nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  nif?: string | null;

  @ApiPropertyOptional({ example: '12345 12 2020 0 12345', nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  stat?: string | null;

  @ApiPropertyOptional({ example: '034 00 000 00', nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'contact@camelias.mg', nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsEmail()
  @MaxLength(200)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Comptes bancaires, une ligne par compte',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  iban?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Numéros mobile money, une ligne par compte',
  })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  mobileMoney?: string | null;

  @ApiPropertyOptional({
    description:
      'Si vrai, cette société devient celle affichée sur les documents officiels',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'Camelias SARL' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  nif?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  stat?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsEmail()
  @MaxLength(200)
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(200)
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  iban?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(2000)
  mobileMoney?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CompanyProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyName!: string;

  @ApiPropertyOptional({ nullable: true })
  nif?: string | null;

  @ApiPropertyOptional({ nullable: true })
  stat?: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  country?: string | null;

  @ApiPropertyOptional({ nullable: true })
  iban?: string | null;

  @ApiPropertyOptional({ nullable: true })
  mobileMoney?: string | null;

  @ApiProperty()
  isDefault!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Chemin API du logo (authentifié)',
  })
  logoUrl?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'URL de prévisualisation (signée si MinIO)',
  })
  logoPreviewUrl?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
