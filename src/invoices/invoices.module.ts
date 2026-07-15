import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { CompanySettingsModule } from '../company-settings/company-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoiceDocumentTemplatesService } from './invoice-document-templates.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [AuditModule, NotificationsModule, CompanySettingsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceDocumentTemplatesService],
  exports: [InvoiceDocumentTemplatesService],
})
export class InvoicesModule {}
