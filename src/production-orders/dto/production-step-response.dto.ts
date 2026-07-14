import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductionStepResponseDto {
  @ApiProperty({ example: 'step-cuid' })
  id!: string;

  @ApiProperty({ example: 'PREPARATION' })
  stage!: string;

  @ApiPropertyOptional({ example: '2026-07-02T00:00:00.000Z', nullable: true })
  plannedStart!: string | null;

  @ApiPropertyOptional({ example: '2026-07-10T00:00:00.000Z', nullable: true })
  plannedEnd!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  actualStart!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  actualEnd!: string | null;

  @ApiProperty({ example: 0 })
  progress!: number;
}
