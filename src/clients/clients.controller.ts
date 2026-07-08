import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ApiPaginatedResponse } from '../common/swagger/api-paginated-response.decorator';
import { ClientsService } from './clients.service';
import { ClientResponseDto } from './dto/client-response.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les clients' })
  @ApiPaginatedResponse(ClientResponseDto, 'Liste paginee des clients')
  findAll(@Query() query: ListQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un client' })
  @ApiOkResponse({ description: 'Client trouvé', type: ClientResponseDto })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Créer un client' })
  @ApiCreatedResponse({ description: 'Client créé', type: ClientResponseDto })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre à jour un client' })
  @ApiOkResponse({ description: 'Client mis à jour', type: ClientResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer un client' })
  @ApiOkResponse({ description: 'Client supprimé' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
