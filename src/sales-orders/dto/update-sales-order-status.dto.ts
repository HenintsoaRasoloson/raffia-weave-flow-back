import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateSalesOrderStatusDto {
  @ApiProperty({
    example: 'IN_PRODUCTION',
    enum: ['QUOTE', 'TO_PROCESS', 'IN_PRODUCTION', 'PREPARING', 'SHIPPED', 'DELIVERED', 'INVOICED', 'CANCELLED'],
  })
  @IsIn([
    'QUOTE',
    'TO_PROCESS',
    'IN_PRODUCTION',
    'PREPARING',
    'SHIPPED',
    'DELIVERED',
    'INVOICED',
    'CANCELLED',
  ])
  status!:
    | 'QUOTE'
    | 'TO_PROCESS'
    | 'IN_PRODUCTION'
    | 'PREPARING'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'INVOICED'
    | 'CANCELLED';
}
