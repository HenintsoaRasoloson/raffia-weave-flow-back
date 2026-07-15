import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INVOICE_TYPES = [
  'PROFORMA',
  'DEPOSIT',
  'INTERMEDIATE',
  'FINAL',
  'CREDIT_NOTE',
] as const;

export class InvoiceTemplateResponseDto {
  @ApiPropertyOptional({
    description: 'Absent lorsque le template par défaut non persisté est renvoyé',
    example: 'tpl123',
  })
  id?: string;

  @ApiProperty({
    enum: INVOICE_TYPES,
    example: 'FINAL',
  })
  type!: (typeof INVOICE_TYPES)[number] | string;

  @ApiProperty({
    example: 'Template facture finale',
  })
  name!: string;

  @ApiPropertyOptional({
    example: 'Facture {{invoiceNumber}} - {{companyName}}',
    nullable: true,
  })
  subject?: string | null;

  @ApiProperty({
    example:
      'Bonjour {{clientName}},\n\nVeuillez trouver votre facture {{invoiceNumber}}.',
  })
  body!: string;

  @ApiPropertyOptional({
    example: 'Raffia Weave Flow',
    nullable: true,
  })
  footer?: string | null;

  @ApiPropertyOptional({
    description: 'true si template synthétique (non encore persisté en base)',
    example: true,
  })
  isDefault?: boolean;

  @ApiPropertyOptional({ example: '2026-07-01T10:00:00.000Z' })
  createdAt?: Date;

  @ApiPropertyOptional({ example: '2026-07-02T10:00:00.000Z' })
  updatedAt?: Date;
}
