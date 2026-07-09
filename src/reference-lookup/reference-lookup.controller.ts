import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReferenceLookupQueryDto } from './dto/reference-lookup-query.dto';
import { ReferenceLookupService } from './reference-lookup.service';

@ApiTags('Reference Lookup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('reference-lookup')
export class ReferenceLookupController {
  constructor(private readonly referenceLookupService: ReferenceLookupService) {}

  @Get()
  @ApiOperation({
    summary: 'Recherche transversale par reference metier',
    description:
      'Recherche toutes les entites liees a un meme niveau de reference (commande, factures, livraisons, OF, achats et sous-elements).',
  })
  @ApiOkResponse({ description: 'Resultat agrege de recherche par reference' })
  find(@Query() query: ReferenceLookupQueryDto) {
    return this.referenceLookupService.findByLevelOrRef({
      level: query.level,
      ref: query.ref,
    });
  }
}
