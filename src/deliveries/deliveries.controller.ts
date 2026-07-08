import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UpdateDeliveryDto } from './dto/update-delivery.dto';
import { DeliveriesService } from './deliveries.service';

@ApiTags('Livraisons')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les livraisons' })
  @ApiOkResponse({ description: 'Liste des livraisons' })
  findAll() {
    return this.deliveriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une livraison' })
  @ApiOkResponse({ description: 'Livraison trouvée' })
  findOne(@Param('id') id: string) {
    return this.deliveriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une livraison' })
  @ApiCreatedResponse({ description: 'Livraison créée' })
  create(@Body() dto: CreateDeliveryDto) {
    return this.deliveriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mettre à jour une livraison' })
  @ApiOkResponse({ description: 'Livraison mise à jour' })
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryDto) {
    return this.deliveriesService.update(id, dto);
  }

  @Patch(':id/mark-delivered')
  @ApiOperation({ summary: 'Marquer une livraison comme livrée' })
  @ApiOkResponse({ description: 'Livraison marquée livrée' })
  markDelivered(@Param('id') id: string) {
    return this.deliveriesService.markDelivered(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une livraison' })
  @ApiOkResponse({ description: 'Livraison supprimée' })
  remove(@Param('id') id: string) {
    return this.deliveriesService.remove(id);
  }
}
