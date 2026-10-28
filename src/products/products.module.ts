import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { GedModule } from '../ged/ged.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [GedModule, AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
