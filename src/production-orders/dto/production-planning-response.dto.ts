import { ApiProperty } from '@nestjs/swagger';

export class ProductionPlanningRowDto {
  @ApiProperty({ example: 'PREPARATION' })
  stage!: string;

  @ApiProperty({ example: 'Préparation' })
  label!: string;

  @ApiProperty({
    description:
      'Charge atelier par jour (nombre d OF dont l etape chevauche ce jour)',
    example: [0, 1, 1, 2, 1, 0],
    type: [Number],
  })
  load!: number[];
}

export class ProductionPlanningResponseDto {
  @ApiProperty({ example: '2026-07-01' })
  from!: string;

  @ApiProperty({ example: '2026-07-31' })
  to!: string;

  @ApiProperty({
    description: 'Colonnes jour (ISO date)',
    example: ['2026-07-01', '2026-07-02'],
    type: [String],
  })
  days!: string[];

  @ApiProperty({ type: [ProductionPlanningRowDto] })
  rows!: ProductionPlanningRowDto[];
}
