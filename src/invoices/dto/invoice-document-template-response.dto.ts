import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  INVOICE_DOCUMENT_LOCALE,
  INVOICE_DOCUMENT_TYPES,
} from '../invoice-document-templates.constants';
import { InvoiceDocumentContentDto } from './invoice-document-content.dto';

export class InvoiceDocumentTemplateResponseDto {
  @ApiProperty({ example: 'clxdocTpl01' })
  id!: string;

  @ApiProperty({ example: 'Facture A4 classique' })
  name!: string;

  @ApiPropertyOptional({
    enum: INVOICE_DOCUMENT_TYPES,
    nullable: true,
    example: 'FINAL',
  })
  invoiceType!: (typeof INVOICE_DOCUMENT_TYPES)[number] | null;

  @ApiProperty({ example: true })
  isDefault!: boolean;

  @ApiProperty({
    example: INVOICE_DOCUMENT_LOCALE,
    enum: [INVOICE_DOCUMENT_LOCALE],
  })
  locale!: typeof INVOICE_DOCUMENT_LOCALE;

  @ApiProperty({ type: InvoiceDocumentContentDto })
  content!: InvoiceDocumentContentDto;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-15T10:00:00.000Z' })
  updatedAt!: Date;
}
