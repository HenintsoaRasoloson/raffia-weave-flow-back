import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  COMPANY_LOGO_ALLOWED_MIME_TYPES,
  COMPANY_LOGO_MAX_FILE_SIZE_BYTES,
} from './company-settings.constants';
import { CompanySettingsService } from './company-settings.service';
import {
  CompanyLogoResponseDto,
  CompanySettingsResponseDto,
  DeleteCompanyLogoResponseDto,
} from './dto/company-logo-response.dto';
import {
  ConvertCurrencyQueryDto,
  ConvertCurrencyResponseDto,
} from './dto/convert-currency.dto';
import {
  CompanyProfileResponseDto,
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
} from './dto/company-profile.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@ApiTags('Parametres')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('company-settings')
export class CompanySettingsController {
  constructor(private readonly companySettingsService: CompanySettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Recuperer les parametres societe (avec slots logos)' })
  @ApiOkResponse({
    description: 'Parametres societe',
    type: CompanySettingsResponseDto,
  })
  getSettings() {
    return this.companySettingsService.getSettings();
  }

  @Get('convert')
  @ApiOperation({
    summary:
      'Convertir un montant MGA ↔ EUR avec le taux societe (1 EUR = eurToMgaRate MGA)',
  })
  @ApiOkResponse({
    description: 'Montant converti',
    type: ConvertCurrencyResponseDto,
  })
  convertCurrency(@Query() query: ConvertCurrencyQueryDto) {
    return this.companySettingsService.convertCurrency(query);
  }

  @Patch()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Mettre a jour les parametres societe' })
  @ApiOkResponse({
    description: 'Parametres societe mis a jour',
    type: CompanySettingsResponseDto,
  })
  updateSettings(
    @Body() dto: UpdateCompanySettingsDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.updateSettings(dto, user.sub);
  }

  @Post('profiles')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Ajouter une société (identité des documents officiels)' })
  @ApiCreatedResponse({ type: CompanyProfileResponseDto })
  createProfile(
    @Body() dto: CreateCompanyProfileDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.createProfile(dto, user.sub);
  }

  @Patch('profiles/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Modifier une société' })
  @ApiOkResponse({ type: CompanyProfileResponseDto })
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyProfileDto,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.updateProfile(id, dto, user.sub);
  }

  @Post('profiles/:id/default')
  @UseGuards(AdminGuard)
  @ApiOperation({
    summary: 'Définir la société affichée sur les documents officiels',
  })
  @ApiOkResponse({ type: CompanyProfileResponseDto })
  setDefaultProfile(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.setDefaultProfile(id, user.sub);
  }

  @Delete('profiles/:id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer une société' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        deleted: { type: 'boolean' },
      },
    },
  })
  deleteProfile(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.deleteProfile(id, user.sub);
  }

  @Post('profiles/:id/logo')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: COMPANY_LOGO_MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        const allowed = COMPANY_LOGO_ALLOWED_MIME_TYPES as readonly string[];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({ type: CompanyProfileResponseDto })
  upsertProfileLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.upsertProfileLogo(id, file, user.sub);
  }

  @Get('profiles/:id/logo')
  @ApiOperation({ summary: 'Lire le logo d une société' })
  async getProfileLogo(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const logo = await this.companySettingsService.getProfileLogoBinary(id);
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${logo.originalName}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    return new StreamableFile(logo.buffer);
  }

  @Delete('profiles/:id/logo')
  @UseGuards(AdminGuard)
  @ApiOkResponse({ type: CompanyProfileResponseDto })
  deleteProfileLogo(
    @Param('id') id: string,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.deleteProfileLogo(id, user.sub);
  }

  @Post('logos/:kind')
  @UseGuards(AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: COMPANY_LOGO_MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        const allowed = COMPANY_LOGO_ALLOWED_MIME_TYPES as readonly string[];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  @ApiOperation({
    summary:
      'Uploader ou remplacer un logo societe (kinds: primary, app, invoice, email)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiCreatedResponse({
    description: 'Logo upserté',
    type: CompanyLogoResponseDto,
  })
  upsertLogo(
    @Param('kind') kind: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtAccessPayload,
  ) {
    return this.companySettingsService.upsertLogo(kind, file, user.sub);
  }

  @Get('logos/:kind')
  @ApiOperation({
    summary: 'Lire le fichier du slot logo exact (sans fallback)',
  })
  @ApiOkResponse({
    description: 'Image logo (binaire, Content-Type = mimeType du fichier)',
    schema: { type: 'string', format: 'binary' },
  })
  async getLogo(
    @Param('kind') kind: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const logo = await this.companySettingsService.getLogoBinary(kind);
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${logo.originalName}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    return new StreamableFile(logo.buffer);
  }

  @Get('logos/:kind/resolved')
  @ApiOperation({
    summary:
      'Lire le logo effectif pour un canal (override, sinon primary). 404 si aucun.',
  })
  @ApiOkResponse({
    description: 'Image logo resolue (binaire)',
    schema: { type: 'string', format: 'binary' },
  })
  async getResolvedLogo(
    @Param('kind') kind: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const logo = await this.companySettingsService.resolveLogoBinary(kind);
    if (!logo) {
      throw new NotFoundException(
        `Aucun logo resolu pour le canal « ${kind} »`,
      );
    }
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${logo.originalName}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=60');
    return new StreamableFile(logo.buffer);
  }

  @Delete('logos/:kind')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Supprimer le logo d un slot (rebascule sur primary)' })
  @ApiOkResponse({
    description: 'Logo supprimé',
    type: DeleteCompanyLogoResponseDto,
  })
  deleteLogo(@Param('kind') kind: string) {
    return this.companySettingsService.deleteLogo(kind);
  }
}
