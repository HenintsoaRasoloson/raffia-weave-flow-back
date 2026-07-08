import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<TData> {
  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: TData[];

  @ApiProperty({ example: 125 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;
}
