import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CompanySettingsService } from './company-settings.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@ApiTags('Parametres')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('company-settings')
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Recuperer les parametres societe' })
  @ApiOkResponse({ description: 'Parametres societe' })
  getSettings() {
    return this.companySettingsService.getSettings();
  }

  @Patch()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre a jour les parametres societe' })
  @ApiOkResponse({ description: 'Parametres societe mis a jour' })
  updateSettings(@Body() dto: UpdateCompanySettingsDto) {
    return this.companySettingsService.updateSettings(dto);
  }
}
