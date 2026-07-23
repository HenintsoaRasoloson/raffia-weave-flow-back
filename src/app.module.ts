import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BomItemsModule } from './bom-items/bom-items.module';
import { ClientsModule } from './clients/clients.module';
import { ComponentsModule } from './components/components.module';
import { CatalogSharesModule } from './catalog-shares/catalog-shares.module';
import { CategoriesModule } from './categories/categories.module';
import { ColorsModule } from './colors/colors.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
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
import { DocumentReferenceModule } from './common/document-reference/document-reference.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GedModule } from './ged/ged.module';
import { FinancialTrackingModule } from './financial-tracking/financial-tracking.module';
import { ReferenceLookupModule } from './reference-lookup/reference-lookup.module';
import { SearchModule } from './search/search.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 30_000,
    }),
    PrismaModule,
    DocumentReferenceModule,
    AuthModule,
    CatalogSharesModule,
    CategoriesModule,
    ColorsModule,
    CompanySettingsModule,
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
    GedModule,
    FinancialTrackingModule,
    ReferenceLookupModule,
    SearchModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
