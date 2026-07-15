import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'Atelier Raphia SAS' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: '89421800300012' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  siret?: string | null;

  @ApiPropertyOptional({ example: 'FR58894218003' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  vatNumber?: string | null;

  @ApiPropertyOptional({ example: 'FR76 3000 4000 0312 3456 7890 143' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  iban?: string | null;

  @ApiPropertyOptional({ example: '12 rue de la Tannerie' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine?: string | null;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @ApiPropertyOptional({ example: '75011' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'France' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cgvText?: string | null;

  @ApiPropertyOptional({
    description: 'Nombre d’Ariary pour 1 Euro (ex: 5000 → 1 EUR = 5000 MGA)',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  eurToMgaRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSendInvoices?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  lowStockAlerts?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiDecisionSupport?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;
}
