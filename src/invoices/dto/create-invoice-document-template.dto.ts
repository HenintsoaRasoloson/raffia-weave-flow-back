import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  INVOICE_DOCUMENT_TEMPLATE_NAME_MAX_LENGTH,
  INVOICE_DOCUMENT_TYPES,
} from '../invoice-document-templates.constants';
import { InvoiceDocumentContentDto } from './invoice-document-content.dto';

export class CreateInvoiceDocumentTemplateDto {
  @ApiProperty({
    example: 'Facture A4 classique',
    minLength: 1,
    maxLength: INVOICE_DOCUMENT_TEMPLATE_NAME_MAX_LENGTH,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(INVOICE_DOCUMENT_TEMPLATE_NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({
    enum: INVOICE_DOCUMENT_TYPES,
    nullable: true,
    description: 'null = applicable à tous les types de facture',
    example: 'FINAL',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsIn(INVOICE_DOCUMENT_TYPES)
  invoiceType?: (typeof INVOICE_DOCUMENT_TYPES)[number] | null;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiProperty({ type: InvoiceDocumentContentDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentContentDto)
  content!: InvoiceDocumentContentDto;
}
