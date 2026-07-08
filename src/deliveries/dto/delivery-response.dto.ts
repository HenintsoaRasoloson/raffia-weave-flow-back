import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeliveryResponseDto {
  @ApiProperty({ example: 'dlv123' })
  id!: string;

  @ApiProperty({ example: 'LIV-2410-091' })
  deliveryNumber!: string;

  @ApiPropertyOptional({ example: 'Colissimo' })
  carrier?: string;

  @ApiProperty({ example: 'IN_TRANSIT' })
  status!: string;
}
