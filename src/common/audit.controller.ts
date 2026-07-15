import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuditService } from './audit.service';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import {
  AuditEntityParamsDto,
  AuditLogsLimitQueryDto,
  AuditUserParamsDto,
  ListAuditLogsQueryDto,
} from './dto/list-audit-logs-query.dto';

@ApiTags('Audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: "Historique d'audit d'une entité",
    description:
      'Retourne tous les changements enregistrés pour une entité (SalesOrder, Invoice, ProductionOrder, etc.)',
  })
  @ApiOkResponse({
    description: "Audit logs de l'entité",
    type: AuditLogResponseDto,
    isArray: true,
  })
  getEntityLogs(
    @Param() params: AuditEntityParamsDto,
    @Query() query: AuditLogsLimitQueryDto,
  ) {
    return this.auditService.getEntityLogs(
      params.entityType,
      params.entityId,
      query.limit ?? 50,
    );
  }

  @Get('user/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: "Actions d'un utilisateur",
    description: 'Retourne toutes les actions qu\'a effectuées un utilisateur',
  })
  @ApiOkResponse({
    description: "Audit logs de l'utilisateur",
    type: AuditLogResponseDto,
    isArray: true,
  })
  getUserLogs(
    @Param() params: AuditUserParamsDto,
    @Query() query: AuditLogsLimitQueryDto,
  ) {
    return this.auditService.getUserLogs(params.userId, query.limit ?? 50);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: "Journal d'audit complet (admin)",
    description:
      'Retourne tous les audit logs avec filtres optionnels. ' +
      'Requiert le rôle ADMIN.',
  })
  @ApiOkResponse({
    description: 'Tous les audit logs',
    type: AuditLogResponseDto,
    isArray: true,
  })
  getAllLogs(@Query() query: ListAuditLogsQueryDto) {
    return this.auditService.getAllLogs(
      {
        entityType: query.entityType,
        action: query.action,
        userId: query.userId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      },
      query.limit ?? 100,
    );
  }
}
