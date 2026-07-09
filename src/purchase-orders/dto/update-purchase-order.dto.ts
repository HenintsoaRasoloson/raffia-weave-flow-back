import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: ['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'])
  status?: 'DRAFT' | 'CONFIRMED' | 'IN_TRANSIT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
