import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { GedModule } from '../ged/ged.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceDocumentTemplatesService } from './invoice-document-templates.service';
import { InvoiceDocumentsService } from './invoice-documents.service';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuditModule, NotificationsModule, CompanySettingsModule, GedModule],
  controllers: [InvoicesController],
  providers: [
    InvoiceDocumentsService,
    InvoicePaymentsService,
    InvoicesService,
    InvoiceDocumentTemplatesService,
  ],
  exports: [InvoiceDocumentTemplatesService],
})
export class InvoicesModule {}
