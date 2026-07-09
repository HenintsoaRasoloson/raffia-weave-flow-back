import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { ComponentsService } from './components.service';
import { ComponentResponseDto } from './dto/component-response.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';

@ApiTags('Composants')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('components')
export class ComponentsController {
  constructor(private readonly componentsService: ComponentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les composants' })
  @ApiPaginatedResponse(ComponentResponseDto, 'Liste paginee des composants')
  findAll(@Query() query: ListQueryDto) {
    return this.componentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un composant' })
  @ApiOkResponse({ type: ComponentResponseDto })
  findOne(@Param('id') id: string) {
    return this.componentsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un composant' })
  @ApiCreatedResponse({ type: ComponentResponseDto })
  create(@Body() dto: CreateComponentDto) {
    return this.componentsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un composant' })
  @ApiOkResponse({ type: ComponentResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateComponentDto) {
    return this.componentsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un composant' })
  remove(@Param('id') id: string) {
    return this.componentsService.remove(id);
  }
}
