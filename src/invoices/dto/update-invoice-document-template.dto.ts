import { PartialType } from '@nestjs/swagger';
import { CreateInvoiceDocumentTemplateDto } from './create-invoice-document-template.dto';

export class UpdateInvoiceDocumentTemplateDto extends PartialType(
  CreateInvoiceDocumentTemplateDto,
) {}
