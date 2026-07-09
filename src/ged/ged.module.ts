import { Module } from '@nestjs/common';
import { GedPathsService } from './ged-paths.service';
import { MinioService } from './minio.service';

@Module({
  providers: [GedPathsService, MinioService],
  exports: [GedPathsService, MinioService],
})
export class GedModule {}
