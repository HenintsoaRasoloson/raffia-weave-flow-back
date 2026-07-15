import { Module } from '@nestjs/common';
import { GedModule } from '../ged/ged.module';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';

@Module({
  imports: [GedModule],
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
