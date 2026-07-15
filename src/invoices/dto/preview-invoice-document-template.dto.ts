import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PreviewInvoiceDocumentTemplateDto {
  @ApiPropertyOptional({
    description:
      'Si omis: dataset mock + CompanySettings. Si fourni: facture réelle.',
    example: 'clxinvoice01',
  })
  @IsOptional()
  @IsString()
  invoiceId?: string;
}
