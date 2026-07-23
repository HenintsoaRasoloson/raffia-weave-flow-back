import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinancialOverviewService } from './financial-overview.service';
import { FinancialTrackingController } from './financial-tracking.controller';
import { FinancialTrackingService } from './financial-tracking.service';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [FinancialTrackingController],
  providers: [FinancialOverviewService, FinancialTrackingService],
  exports: [FinancialTrackingService],
})
export class FinancialTrackingModule {}
