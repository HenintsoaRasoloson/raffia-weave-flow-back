import { Module } from '@nestjs/common';
import { ProductionOrdersController } from './production-orders.controller';
import { ProductionOrdersService } from './production-orders.service';
import { AuditModule } from '../common/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SalesOrdersModule } from '../sales-orders/sales-orders.module';

@Module({
  imports: [AuditModule, NotificationsModule, SalesOrdersModule],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService],
})
export class ProductionOrdersModule {}
