import { Module } from '@nestjs/common';
import { BomItemsController } from './bom-items.controller';
import { BomItemsService } from './bom-items.service';

@Module({
  controllers: [BomItemsController],
  providers: [BomItemsService],
  exports: [BomItemsService],
})
export class BomItemsModule {}
