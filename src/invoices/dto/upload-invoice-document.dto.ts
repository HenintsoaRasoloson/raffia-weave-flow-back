import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const INVOICE_DOCUMENT_KINDS = [
  'SIGNED',
  'STAMPED',
  'SIGNED_AND_STAMPED',
  'OTHER',
] as const;

export class UploadInvoiceDocumentDto {
  @ApiProperty({
    enum: INVOICE_DOCUMENT_KINDS,
    example: 'SIGNED_AND_STAMPED',
    description:
      'Type de document uploadé (facture signée, cachetée, signée+cachetée, autre)',
  })
  @IsIn([...INVOICE_DOCUMENT_KINDS])
  kind!: (typeof INVOICE_DOCUMENT_KINDS)[number];

  @ApiPropertyOptional({
    example: 'Version signée par le client',
    description: 'Commentaire libre côté front (optionnel)',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
