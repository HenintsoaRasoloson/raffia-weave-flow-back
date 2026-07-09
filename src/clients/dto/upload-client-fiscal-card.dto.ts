import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UploadClientFiscalCardDto {
  @ApiProperty({
    example: '2027-12-31T00:00:00.000Z',
    description: 'Date de validite de la carte fiscale',
  })
  @IsDateString()
  validUntil!: string;

  @ApiPropertyOptional({
    example: 'Carte fiscale 2027',
    description: 'Commentaire optionnel',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
