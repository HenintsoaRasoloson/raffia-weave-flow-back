import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComponentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ref!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  unit!: string;

  @ApiProperty()
  stockQty!: number;

  @ApiProperty()
  minQty!: number;

  @ApiPropertyOptional()
  costPerUnit?: number;

  @ApiPropertyOptional()
  supplierId?: string;
}
