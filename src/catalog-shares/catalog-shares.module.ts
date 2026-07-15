import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { CatalogSharesController } from './catalog-shares.controller';
import { CatalogSharesService } from './catalog-shares.service';

@Module({
  imports: [ProductsModule],
  controllers: [CatalogSharesController],
  providers: [CatalogSharesService],
  exports: [CatalogSharesService],
})
export class CatalogSharesModule {}
