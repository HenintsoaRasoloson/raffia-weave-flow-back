import { ApiProperty } from '@nestjs/swagger';

export class InvoiceDocumentTemplatePreviewResponseDto {
  @ApiProperty({
    example: '<!DOCTYPE html><html lang="fr">...</html>',
    description: 'Document HTML A4 prêt à prévisualiser (MVP, pas de PDF)',
  })
  html!: string;
}
