import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogUserResponseDto {
  @ApiProperty({ example: 'usr123' })
  id!: string;

  @ApiProperty({ example: 'admin@raffia.test' })
  email!: string;

  @ApiPropertyOptional({
    example: 'Admin Raffia',
    nullable: true,
  })
  name?: string | null;

  @ApiPropertyOptional({
    description: 'Présent sur les listes entity / admin, absent sur user/:userId',
    enum: [
      'GERANT',
      'RESPONSABLE_GENERAL',
      'RESPONSABLE_PRODUCTION',
      'RESPONSABLE_LIVRAISON',
      'RESPONSABLE_FINANCIER_STOCKS',
    ],
    example: 'GERANT',
  })
  role?: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ example: 'aud123' })
  id!: string;

  @ApiProperty({
    description: 'Type d’entité auditée',
    example: 'SalesOrder',
  })
  entityType!: string;

  @ApiProperty({ example: 'so123' })
  entityId!: string;

  @ApiProperty({
    description: 'Action auditée (enum AuditAction Prisma)',
    example: 'SALES_ORDER_STATUS_CHANGED',
  })
  action!: string;

  @ApiProperty({ example: 'usr123' })
  userId!: string;

  @ApiProperty({
    description: 'Utilisateur à l’origine de l’action',
    type: AuditLogUserResponseDto,
  })
  user!: AuditLogUserResponseDto;

  @ApiPropertyOptional({
    description: 'Diff JSON des champs modifiés (before/after)',
    nullable: true,
    type: 'object',
    additionalProperties: true,
    example: { before: { status: 'TO_PROCESS' }, after: { status: 'IN_PRODUCTION' } },
  })
  changes?: object | string | number | boolean | null;

  @ApiPropertyOptional({
    description: 'Détail libre (raison, référence…)',
    nullable: true,
    example: 'Passage en production',
  })
  details?: string | null;

  @ApiProperty({ example: '2026-07-01T10:00:00.000Z' })
  createdAt!: Date;
}
