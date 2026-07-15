import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AuditAction } from '../../generated/prisma/client';

export class AuditLogsLimitQueryDto {
  @ApiPropertyOptional({
    description: 'Nombre max de logs retournés',
    minimum: 1,
    maximum: 500,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}

export class ListAuditLogsQueryDto extends AuditLogsLimitQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrer par type d’entité',
    example: 'SalesOrder',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par action (enum AuditAction)',
    enum: AuditAction,
    example: AuditAction.SALES_ORDER_CREATED,
  })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({
    description: 'Filtrer par utilisateur',
    example: 'usr123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Début de période (ISO)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fin de période (ISO)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AuditEntityParamsDto {
  @ApiProperty({
    description: 'Type d’entité (ex. SalesOrder, Invoice)',
    example: 'SalesOrder',
  })
  @IsString()
  entityType!: string;

  @ApiProperty({
    description: 'Identifiant de l’entité',
    example: 'so123',
  })
  @IsString()
  entityId!: string;
}

export class AuditUserParamsDto {
  @ApiProperty({
    description: 'Identifiant utilisateur',
    example: 'usr123',
  })
  @IsString()
  userId!: string;
}
