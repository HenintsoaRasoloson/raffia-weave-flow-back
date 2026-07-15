import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  INVOICE_DOCUMENT_CONTENT_VERSION,
  INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH,
} from '../invoice-document-templates.constants';
import { IsPlainText } from '../validators/is-plain-text.validator';

export class InvoiceDocumentHeaderDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  showLogo!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showCompanyName!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showCompanyAddress!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showSiret!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showVatNumber!: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @IsString()
  @MaxLength(INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH)
  @IsPlainText()
  titleOverride?: string | null;
}

export class InvoiceDocumentClientBlockDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  showAddress!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showContactName!: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Facturé à',
  })
  @IsOptional()
  @IsString()
  @MaxLength(INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH)
  @IsPlainText()
  label?: string | null;
}

export class InvoiceDocumentMetaDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  showInvoiceNumber!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showIssueDate!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showDueDate!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showOrderReference!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showCurrency!: boolean;
}

export class InvoiceDocumentLineColumnsDto {
  @ApiProperty({
    example: true,
    description: 'Toujours true en v1 — sinon validation 400',
  })
  @Equals(true, {
    message: 'lines.columns.description must be true',
  })
  description!: true;

  @ApiProperty({ example: true })
  @IsBoolean()
  quantity!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  unitPriceHt!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  taxRate!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  lineTotalHt!: boolean;
}

export class InvoiceDocumentLinesDto {
  @ApiProperty({ type: InvoiceDocumentLineColumnsDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentLineColumnsDto)
  columns!: InvoiceDocumentLineColumnsDto;
}

export class InvoiceDocumentTotalsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  showSubtotalHt!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showTaxAmount!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showTotalTtc!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  showPaidAmount!: boolean;
}

export class InvoiceDocumentNotesDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  showInvoiceNotes!: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @IsString()
  @MaxLength(INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH)
  @IsPlainText()
  introText?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @IsString()
  @MaxLength(INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH)
  @IsPlainText()
  closingText?: string | null;
}

export class InvoiceDocumentLegalDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  showCgv!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  showIban!: boolean;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: null,
  })
  @IsOptional()
  @IsString()
  @MaxLength(INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH)
  @IsPlainText()
  customMentions?: string | null;
}

export class InvoiceDocumentFooterDto {
  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Merci pour votre confiance — {{companyName}}',
  })
  @IsOptional()
  @IsString()
  @MaxLength(INVOICE_DOCUMENT_FREE_TEXT_MAX_LENGTH)
  @IsPlainText()
  text?: string | null;
}

export class InvoiceDocumentContentDto {
  @ApiProperty({
    type: Number,
    enum: [INVOICE_DOCUMENT_CONTENT_VERSION],
    example: INVOICE_DOCUMENT_CONTENT_VERSION,
    description: 'Doit être strictement 1 (v1)',
  })
  @Type(() => Number)
  @IsInt()
  @Equals(INVOICE_DOCUMENT_CONTENT_VERSION, {
    message: `content.version must be ${INVOICE_DOCUMENT_CONTENT_VERSION}`,
  })
  version!: typeof INVOICE_DOCUMENT_CONTENT_VERSION;

  @ApiProperty({ type: InvoiceDocumentHeaderDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentHeaderDto)
  header!: InvoiceDocumentHeaderDto;

  @ApiProperty({ type: InvoiceDocumentClientBlockDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentClientBlockDto)
  clientBlock!: InvoiceDocumentClientBlockDto;

  @ApiProperty({ type: InvoiceDocumentMetaDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentMetaDto)
  meta!: InvoiceDocumentMetaDto;

  @ApiProperty({ type: InvoiceDocumentLinesDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentLinesDto)
  lines!: InvoiceDocumentLinesDto;

  @ApiProperty({ type: InvoiceDocumentTotalsDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentTotalsDto)
  totals!: InvoiceDocumentTotalsDto;

  @ApiProperty({ type: InvoiceDocumentNotesDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentNotesDto)
  notes!: InvoiceDocumentNotesDto;

  @ApiProperty({ type: InvoiceDocumentLegalDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentLegalDto)
  legal!: InvoiceDocumentLegalDto;

  @ApiProperty({ type: InvoiceDocumentFooterDto })
  @ValidateNested()
  @Type(() => InvoiceDocumentFooterDto)
  footer!: InvoiceDocumentFooterDto;
}
