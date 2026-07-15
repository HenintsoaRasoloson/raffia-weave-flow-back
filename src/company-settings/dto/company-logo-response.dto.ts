import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  COMPANY_LOGO_KINDS,
  type CompanyLogoKindParam,
} from '../company-settings.constants';

const COMPRESSION_ALGOS = ['NONE', 'GZIP'] as const;

export class CompanyLogoResponseDto {
  @ApiProperty({ example: 'clg123' })
  id!: string;

  @ApiProperty({ example: 'cst123' })
  companySettingId!: string;

  @ApiProperty({ enum: COMPANY_LOGO_KINDS, example: 'primary' })
  kind!: CompanyLogoKindParam;

  @ApiProperty({ example: 'logo-atelier.png' })
  originalName!: string;

  @ApiProperty({ example: 'image/png' })
  mimeType!: string;

  @ApiPropertyOptional({ nullable: true, example: 'ged-raw' })
  bucket?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    example:
      'admin/company-setting/cst123/logo_primary/2026/07/15/v1/company-setting-cst123-logo_primary-logo-atelier-20260715-101500-a1b2c3.png',
  })
  objectKey?: string | null;

  @ApiPropertyOptional({ nullable: true })
  storagePath?: string | null;

  @ApiProperty({ example: 48000 })
  originalSize!: number;

  @ApiProperty({ example: 32000 })
  compressedSize!: number;

  @ApiProperty({ enum: COMPRESSION_ALGOS, example: 'GZIP' })
  compressionAlgo!: (typeof COMPRESSION_ALGOS)[number] | string;

  @ApiPropertyOptional({ nullable: true, example: 'usr123' })
  uploadedById?: string | null;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  updatedAt!: Date;

  @ApiPropertyOptional({ example: 1 })
  version?: number;

  @ApiProperty({
    description: 'URL relative de lecture du fichier du slot',
    example: '/company-settings/logos/primary',
  })
  url!: string;
}

export class CompanyLogoSlotDto {
  @ApiProperty({ enum: COMPANY_LOGO_KINDS, example: 'invoice' })
  kind!: CompanyLogoKindParam;

  @ApiPropertyOptional({
    type: CompanyLogoResponseDto,
    nullable: true,
    description: 'Logo uploadé sur ce slot (sans fallback)',
  })
  logo!: CompanyLogoResponseDto | null;

  @ApiPropertyOptional({
    type: CompanyLogoResponseDto,
    nullable: true,
    description:
      'Logo effectif pour ce canal (override du slot, sinon PRIMARY, sinon null)',
  })
  resolved!: CompanyLogoResponseDto | null;

  @ApiProperty({
    description:
      'true si le canal utilise le logo principal faute d’override dédié',
    example: true,
  })
  fallsBackToPrimary!: boolean;
}

export class CompanySettingsResponseDto {
  @ApiProperty({ example: 'cst123' })
  id!: string;

  @ApiProperty({ example: 'Atelier Raphia SAS' })
  companyName!: string;

  @ApiPropertyOptional({ nullable: true })
  siret?: string | null;

  @ApiPropertyOptional({ nullable: true })
  vatNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  iban?: string | null;

  @ApiPropertyOptional({ nullable: true })
  addressLine?: string | null;

  @ApiPropertyOptional({ nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  postalCode?: string | null;

  @ApiPropertyOptional({ nullable: true })
  country?: string | null;

  @ApiPropertyOptional({ nullable: true })
  cgvText?: string | null;

  @ApiProperty({
    example: 'MGA',
    description: 'Devise de référence (MVP: MGA)',
  })
  defaultCurrency!: string;

  @ApiProperty({
    example: 5000,
    description: 'Nombre d’Ariary pour 1 Euro',
  })
  eurToMgaRate!: number;

  @ApiProperty()
  autoSendInvoices!: boolean;

  @ApiProperty()
  lowStockAlerts!: boolean;

  @ApiProperty()
  aiDecisionSupport!: boolean;

  @ApiProperty()
  darkMode!: boolean;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' })
  updatedAt!: Date;

  @ApiProperty({ type: [CompanyLogoSlotDto] })
  logoSlots!: CompanyLogoSlotDto[];
}

export class DeleteCompanyLogoResponseDto {
  @ApiProperty({ enum: COMPANY_LOGO_KINDS, example: 'email' })
  kind!: CompanyLogoKindParam;

  @ApiProperty({ example: true })
  deleted!: boolean;
}
