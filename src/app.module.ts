import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BomItemsModule } from './bom-items/bom-items.module';
import { ClientsModule } from './clients/clients.module';
import { ComponentsModule } from './components/components.module';
import { CatalogSharesModule } from './catalog-shares/catalog-shares.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductionOrdersModule } from './production-orders/production-orders.module';
import { ProductsModule } from './products/products.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { SalesOrdersModule } from './sales-orders/sales-orders.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { AuditModule } from './common/audit.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CatalogSharesModule,
    ClientsModule,
    DashboardModule,
    SuppliersModule,
    ComponentsModule,
    BomItemsModule,
    ProductsModule,
    SalesOrdersModule,
    PurchaseOrdersModule,
    ProductionOrdersModule,
    DeliveriesModule,
    InvoicesModule,
    NotificationsModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
