import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const BAT_DOCUMENT_KINDS = [
  'PREVIEW',
  'SENT_TO_CLIENT',
  'APPROVED_SIGNED',
  'OTHER',
] as const;

export class UploadBatDocumentDto {
  @ApiProperty({
    enum: BAT_DOCUMENT_KINDS,
    example: 'APPROVED_SIGNED',
    description: 'Type du document BAT uploadé',
  })
  @IsIn([...BAT_DOCUMENT_KINDS])
  kind!: (typeof BAT_DOCUMENT_KINDS)[number];

  @ApiPropertyOptional({
    example: 'BAT validé et signé par le client',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
