import { Global, Module } from '@nestjs/common';
import { DocumentReferenceService } from './document-reference.service';

@Global()
@Module({
  providers: [DocumentReferenceService],
  exports: [DocumentReferenceService],
})
export class DocumentReferenceModule {}
