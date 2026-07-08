import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductionProgressDto {
  @ApiProperty({ example: 72, minimum: 0, maximum: 100 })
  progress!: number;

  @ApiProperty({
    example: 'IN_PROGRESS',
    enum: ['PLANNED', 'PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    required: false,
  })
  status?: 'PLANNED' | 'PREPARATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}
