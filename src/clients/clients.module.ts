import { Module } from '@nestjs/common';
import { GedModule } from '../ged/ged.module';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [GedModule],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
