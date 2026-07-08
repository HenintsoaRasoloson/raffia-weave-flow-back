import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'prd123' })
  id!: string;

  @ApiProperty({ example: 'RAF-CAB-001' })
  ref!: string;

  @ApiProperty({ example: 'Cabas Madagascar' })
  name!: string;

  @ApiProperty({ example: 89 })
  basePrice!: number;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}
