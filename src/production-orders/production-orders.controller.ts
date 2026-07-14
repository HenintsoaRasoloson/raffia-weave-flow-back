import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAccessPayload } from '../auth/auth.types';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';
import { PlanningQueryDto } from './dto/planning-query.dto';
import { ProductionOrderResponseDto } from './dto/production-order-response.dto';
import { ProductionPlanningResponseDto } from './dto/production-planning-response.dto';
import { UpdateProductionOrderDto } from './dto/update-production-order.dto';
import { UpdateProductionProgressDto } from './dto/update-production-progress.dto';
import { UpsertProductionStagesDto } from './dto/upsert-production-stages.dto';
import { ProductionOrdersService } from './production-orders.service';

@ApiTags('Production')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lister les ordres de fabrication' })
  @ApiPaginatedResponse(
    ProductionOrderResponseDto,
    'Liste paginee des ordres de fabrication',
  )
  findAll(@Query() query: ListQueryDto) {
    return this.productionOrdersService.findAll(query);
  }

  @Get('planning')
  @ApiOperation({
    summary: 'Planning charge atelier par etape',
    description:
      'Retourne la matrice etape x jour (charge = nombre d OF dont l etape planifiee chevauche chaque jour).',
  })
  @ApiOkResponse({
    description: 'Matrice de charge atelier',
    type: ProductionPlanningResponseDto,
  })
  getPlanning(@Query() query: PlanningQueryDto): Promise<ProductionPlanningResponseDto> {
    return this.productionOrdersService.getPlanning(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF trouvé', type: ProductionOrderResponseDto })
  findOne(@Param('id') id: string) {
    return this.productionOrdersService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un ordre de fabrication' })
  @ApiCreatedResponse({ description: 'OF créé', type: ProductionOrderResponseDto })
  create(
    @Body() dto: CreateProductionOrderDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.productionOrdersService.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF mis à jour', type: ProductionOrderResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProductionOrderDto) {
    return this.productionOrdersService.update(id, dto);
  }

  @Patch(':id/stages')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Planifier / mettre a jour les etapes atelier d un OF',
    description:
      'Upsert des ProductionStep (plannedStart/plannedEnd, progress). Necessaire pour alimenter le planning charge atelier.',
  })
  @ApiOkResponse({
    description: 'OF avec etapes mises a jour',
    type: ProductionOrderResponseDto,
  })
  upsertStages(@Param('id') id: string, @Body() dto: UpsertProductionStagesDto) {
    return this.productionOrdersService.upsertStages(id, dto);
  }

  @Patch(':id/progress')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour l avancement métier d un OF' })
  @ApiOkResponse({
    description: 'Progression OF mise à jour',
    type: ProductionOrderResponseDto,
  })
  updateProgress(
    @Param('id') id: string,
    @Body() dto: UpdateProductionProgressDto,
  ) {
    return this.productionOrdersService.updateProgress(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un ordre de fabrication' })
  @ApiOkResponse({ description: 'OF supprimé' })
  remove(@Param('id') id: string) {
    return this.productionOrdersService.remove(id);
  }

  @Get(':id/check-materials')
  @ApiOperation({
    summary: 'Vérifier la disponibilité des matières premières',
    description:
      'Compare la nomenclature (BOM) × quantité de l\'OF avec le stock disponible. ' +
      'Retourne la liste des composants avec manque éventuel.',
  })
  @ApiOkResponse({ description: 'Résultat du check matières' })
  checkMaterials(@Param('id') id: string) {
    return this.productionOrdersService.checkMaterials(id);
  }

  @Patch(':id/approve-quality')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Valider la conformité qualité d\'un OF terminé',
    description:
      'Marque l\'OF comme conforme après contrôle. Prérequis : statut COMPLETED.',
  })
  @ApiOkResponse({ description: 'OF validé qualité', type: ProductionOrderResponseDto })
  approveQuality(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.productionOrdersService.approveQuality(id, user.sub);
  }
}
