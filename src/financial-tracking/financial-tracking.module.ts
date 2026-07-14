import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinancialTrackingController } from './financial-tracking.controller';
import { FinancialTrackingService } from './financial-tracking.service';

@Module({
  imports: [NotificationsModule],
  controllers: [FinancialTrackingController],
  providers: [FinancialTrackingService],
  exports: [FinancialTrackingService],
})
export class FinancialTrackingModule {}