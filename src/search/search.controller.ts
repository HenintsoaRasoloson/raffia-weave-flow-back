import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import { GlobalSearchResponseDto } from './dto/global-search-response.dto';
import { SearchService } from './search.service';

@ApiTags('Global Search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @ApiOperation({
    summary: 'Recherche globale application (header)',
    description:
      'Recherche transversale optimisee avec filtres avances, multi-entites et limites par entite.',
  })
  @ApiOkResponse({
    description: 'Resultats agregees par entite',
    type: GlobalSearchResponseDto,
  })
  global(@Query() query: GlobalSearchQueryDto): Promise<GlobalSearchResponseDto> {
    return this.searchService.globalSearch(query);
  }
}
