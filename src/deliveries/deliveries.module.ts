import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';

@Module({
  imports: [NotificationsModule, SalesOrdersModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
