import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional()
  paidAmount?: number;

  @ApiPropertyOptional()
  paidAt?: Date | null;

  @ApiProperty()
  orderDate!: Date;
}
