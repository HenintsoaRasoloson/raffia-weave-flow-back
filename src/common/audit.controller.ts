import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('entity/:entityType/:entityId')
  @ApiOperation({
    summary: 'Historique d\'audit d\'une entité',
    description:
      'Retourne tous les changements enregistrés pour une entité (SalesOrder, Invoice, ProductionOrder, etc.)',
  })
  @ApiOkResponse({ description: 'Audit logs de l\'entité' })
  getEntityLogs(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getEntityLogs(
      entityType,
      entityId,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('user/:userId')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Actions d\'un utilisateur',
    description: 'Retourne toutes les actions qu\'a effectuées un utilisateur',
  })
  @ApiOkResponse({ description: 'Audit logs de l\'utilisateur' })
  getUserLogs(@Param('userId') userId: string, @Query('limit') limit?: string) {
    return this.auditService.getUserLogs(userId, limit ? parseInt(limit) : 50);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Journal d\'audit complet (admin)',
    description:
      'Retourne tous les audit logs avec filtres optionnels. ' +
      'Requiert le rôle ADMIN.',
  })
  @ApiOkResponse({ description: 'Tous les audit logs' })
  getAllLogs(
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getAllLogs(
      {
        entityType,
        action,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      limit ? parseInt(limit) : 100,
    );
  }
}
