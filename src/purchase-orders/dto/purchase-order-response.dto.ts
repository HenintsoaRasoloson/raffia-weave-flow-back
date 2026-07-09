import { ApiProperty } from '@nestjs/swagger';

export class PurchaseOrderResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  supplierId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalHt!: number;

  @ApiProperty()
  orderDate!: Date;
}
