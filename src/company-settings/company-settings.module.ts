import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { GedModule } from '../ged/ged.module';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';

@Module({
  imports: [GedModule, AuditModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
