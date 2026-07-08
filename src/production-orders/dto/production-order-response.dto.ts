import { ApiProperty } from '@nestjs/swagger';

export class ProductionOrderResponseDto {
  @ApiProperty({ example: 'po123' })
  id!: string;

  @ApiProperty({ example: 'OF-2410-014' })
  orderNumber!: string;

  @ApiProperty({ example: 60 })
  quantity!: number;

  @ApiProperty({ example: 72 })
  progress!: number;

  @ApiProperty({ example: 'IN_PROGRESS' })
  status!: string;
}
