import { Module } from '@nestjs/common';
import { FinancialTrackingController } from './financial-tracking.controller';
import { FinancialTrackingService } from './financial-tracking.service';

@Module({
  controllers: [FinancialTrackingController],
  providers: [FinancialTrackingService],
})
export class FinancialTrackingModule {}