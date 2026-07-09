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
import { ListQueryDto } from '../common/dto/list-query.dto';
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@ApiTags('Couleurs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les couleurs' })
  @ApiOkResponse({ description: 'Liste paginee des couleurs' })
  findAll(@Query() query: ListQueryDto) {
    return this.colorsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Recuperer une couleur' })
  @ApiOkResponse({ description: 'Couleur trouvee' })
  findOne(@Param('id') id: string) {
    return this.colorsService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Creer une couleur' })
  @ApiCreatedResponse({ description: 'Couleur creee' })
  create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre a jour une couleur' })
  @ApiOkResponse({ description: 'Couleur mise a jour' })
  update(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.colorsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une couleur' })
  @ApiOkResponse({ description: 'Couleur supprimee' })
  remove(@Param('id') id: string) {
    return this.colorsService.remove(id);
  }
}
