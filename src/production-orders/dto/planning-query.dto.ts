import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class PlanningQueryDto {
  @ApiPropertyOptional({
    description: 'Debut de periode (YYYY-MM-DD). Defaut: 1er jour du mois courant',
    example: '2026-07-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Fin de periode (YYYY-MM-DD). Defaut: dernier jour du mois courant',
    example: '2026-07-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
