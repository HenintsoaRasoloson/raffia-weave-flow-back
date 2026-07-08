import { ApiProperty } from '@nestjs/swagger';

export class SalesOrderResponseDto {
  @ApiProperty({ example: 'so123' })
  id!: string;

  @ApiProperty({ example: 'CMD-2410-0188' })
  orderNumber!: string;

  @ApiProperty({ example: 'B2B', enum: ['B2B', 'B2C'] })
  orderType!: 'B2B' | 'B2C';

  @ApiProperty({ example: 'TO_PROCESS' })
  status!: string;

  @ApiProperty({ example: 8420 })
  totalHt!: number;
}
