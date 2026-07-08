import { ApiProperty } from '@nestjs/swagger';

export class InvoiceResponseDto {
  @ApiProperty({ example: 'inv123' })
  id!: string;

  @ApiProperty({ example: 'FAC-2026-0421' })
  invoiceNumber!: string;

  @ApiProperty({ example: 'FINAL' })
  type!: string;

  @ApiProperty({ example: 'ISSUED' })
  status!: string;

  @ApiProperty({ example: 9792 })
  totalTtc!: number;
}
