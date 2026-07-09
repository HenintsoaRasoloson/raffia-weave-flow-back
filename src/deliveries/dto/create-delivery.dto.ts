import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryDto {
  @ApiPropertyOptional({
    example: 'LIV/000188',
    description:
      'Reference livraison. Si absente, elle est generee automatiquement.',
  })
  @IsOptional()
  @IsString()
  deliveryNumber?: string;

  @ApiProperty({ example: 'clx-sales-order-id' })
  @IsString()
  salesOrderId!: string;

  @ApiProperty({ example: 'clx-client-id' })
  @IsString()
  clientId!: string;

  @ApiPropertyOptional({ example: 'Colissimo' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ example: 'TRACK123' })
  @IsOptional()
  @IsString()
  trackingCode?: string;

  @ApiPropertyOptional({ example: '2026-09-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  eta?: string;

  @ApiPropertyOptional({ example: 'PLANNED', enum: ['PLANNED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'] })
  @IsOptional()
  @IsIn(['PLANNED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'])
  status?: 'PLANNED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

  @ApiPropertyOptional({ example: 'Livraison client B2B' })
  @IsOptional()
  @IsString()
  notes?: string;
}
