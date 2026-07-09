import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ReplaceClientFiscalCardDto {
  @ApiPropertyOptional({
    example: '2028-12-31T00:00:00.000Z',
    description: 'Nouvelle date de validite (optionnel, conserve l\'ancienne sinon)',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;
}
