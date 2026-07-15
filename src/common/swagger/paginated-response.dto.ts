import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<TData> {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: TData[];

  @ApiProperty({ type: Number, example: 125 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  pageSize!: number;
}
