import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { BomItemsService } from './bom-items.service';
import { BomItemResponseDto } from './dto/bom-item-response.dto';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { UpdateBomItemDto } from './dto/update-bom-item.dto';

@ApiTags('BOM')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('bom-items')
export class BomItemsController {
  constructor(private readonly bomItemsService: BomItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les items de nomenclature' })
  @ApiPaginatedResponse(BomItemResponseDto, 'Liste paginee des items BOM')
  findAll(@Query() query: ListQueryDto) {
    return this.bomItemsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un item BOM' })
  @ApiOkResponse({ type: BomItemResponseDto })
  findOne(@Param('id') id: string) {
    return this.bomItemsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un item BOM' })
  @ApiCreatedResponse({ type: BomItemResponseDto })
  create(@Body() dto: CreateBomItemDto) {
    return this.bomItemsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un item BOM' })
  @ApiOkResponse({ type: BomItemResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateBomItemDto) {
    return this.bomItemsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un item BOM' })
  remove(@Param('id') id: string) {
    return this.bomItemsService.remove(id);
  }
}
