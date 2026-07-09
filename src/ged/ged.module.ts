import { Global, Module } from '@nestjs/common';
import { GedPathsService } from './ged-paths.service';
import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [GedPathsService, MinioService],
  exports: [GedPathsService, MinioService],
})
export class GedModule {}
