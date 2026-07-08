import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliveryDto {
  @ApiProperty({ example: 'LIV-2410-091' })
  deliveryNumber!: string;

  @ApiProperty({ example: 'clx-sales-order-id' })
  salesOrderId!: string;

  @ApiProperty({ example: 'clx-client-id' })
  clientId!: string;

  @ApiPropertyOptional({ example: 'Colissimo' })
  carrier?: string;

  @ApiPropertyOptional({ example: 'TRACK123' })
  trackingCode?: string;

  @ApiPropertyOptional({ example: '2026-09-20T00:00:00.000Z' })
  eta?: string;

  @ApiPropertyOptional({ example: 'PLANNED', enum: ['PLANNED', 'PREPARING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'] })
  status?: 'PLANNED' | 'PREPARING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

  @ApiPropertyOptional({ example: 'Livraison client B2B' })
  notes?: string;
}
