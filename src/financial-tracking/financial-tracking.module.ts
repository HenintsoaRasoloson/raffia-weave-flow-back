import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinancialTrackingController } from './financial-tracking.controller';
import { FinancialTrackingService } from './financial-tracking.service';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [FinancialTrackingController],
  providers: [FinancialTrackingService],
  exports: [FinancialTrackingService],
})
export class FinancialTrackingModule {}
