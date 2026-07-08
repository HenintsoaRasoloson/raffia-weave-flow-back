import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateProductionProgressDto {
  @ApiProperty({ example: 72, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number;

  @ApiProperty({
    example: 'IN_PROGRESS',
    enum: ['PLANNED', 'PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    required: false,
  })
  @IsOptional()
  @IsIn(['PLANNED', 'PREPARATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: 'PLANNED' | 'PREPARATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}
