import { Module } from '@nestjs/common';
import { AuditModule } from '../common/audit.module';
import { BomItemsController } from './bom-items.controller';
import { BomItemsService } from './bom-items.service';

@Module({
  imports: [AuditModule],
  controllers: [BomItemsController],
  providers: [BomItemsService],
  exports: [BomItemsService],
})
export class BomItemsModule {}
