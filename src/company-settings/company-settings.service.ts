import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  convertAmount,
  decimalToNumber,
  normalizeCurrency,
} from '../common/currency/currency.util';
import { AuditService } from '../common/audit.service';
import { CACHE_KEYS, CACHE_TTL_MS } from '../common/cache/cache-keys';
import type { CompanyLogo, CompanyLogoKind } from '../generated/prisma/client';
import { decompressBufferIfNeeded } from '../ged/compression.util';
import { DEFAULT_GED_BUCKET_RAW } from '../ged/ged.constants';
import { GedPathsService } from '../ged/ged-paths.service';
import { MinioService } from '../ged/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  COMPANY_LOGO_ALLOWED_MIME_TYPES,
  COMPANY_LOGO_GED_DOCUMENT_TYPE,
  COMPANY_LOGO_KINDS,
  COMPANY_LOGO_MAX_FILE_SIZE_BYTES,
  DEFAULT_COMPANY_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_EUR_TO_MGA_RATE,
  type CompanyLogoKindParam,
} from './company-settings.constants';
import {
  CompanyLogoResponseDto,
  CompanyLogoSlotDto,
  CompanySettingsResponseDto,
  DeleteCompanyLogoResponseDto,
} from './dto/company-logo-response.dto';
import {
  ConvertCurrencyQueryDto,
  ConvertCurrencyResponseDto,
} from './dto/convert-currency.dto';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

const KIND_TO_PRISMA: Record<CompanyLogoKindParam, CompanyLogoKind> = {
  primary: 'PRIMARY',
  app: 'APP',
  invoice: 'INVOICE',
  email: 'EMAIL',
};

const PRISMA_TO_KIND: Record<CompanyLogoKind, CompanyLogoKindParam> = {
  PRIMARY: 'primary',
  APP: 'app',
  INVOICE: 'invoice',
  EMAIL: 'email',
};

@Injectable()
export class CompanySettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly gedPathsService: GedPathsService,
    private readonly auditService: AuditService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getSettings(): Promise<CompanySettingsResponseDto> {
    const cached = await this.cache.get<CompanySettingsResponseDto>(
      CACHE_KEYS.companySettings,
    );
    if (cached) {
      return cached;
    }

    const settings = await this.ensureSettings();
    const logos = await this.prisma.companyLogo.findMany({
      where: { companySettingId: settings.id },
    });
    const response = await this.toSettingsResponse(settings, logos);
    await this.cache.set(
      CACHE_KEYS.companySettings,
      response,
      CACHE_TTL_MS.companySettings,
    );
    return response;
  }

  async updateSettings(
    dto: UpdateCompanySettingsDto,
    userId?: string,
  ): Promise<CompanySettingsResponseDto> {
    const current = await this.ensureSettings();

    const updated = await this.prisma.companySetting.update({
      where: { id: current.id },
      data: {
        ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
        ...(dto.siret !== undefined ? { siret: dto.siret } : {}),
        ...(dto.vatNumber !== undefined ? { vatNumber: dto.vatNumber } : {}),
        ...(dto.iban !== undefined ? { iban: dto.iban } : {}),
        ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.cgvText !== undefined ? { cgvText: dto.cgvText } : {}),
        ...(dto.eurToMgaRate !== undefined
          ? { eurToMgaRate: dto.eurToMgaRate }
          : {}),
        ...(dto.autoSendInvoices !== undefined
          ? { autoSendInvoices: dto.autoSendInvoices }
          : {}),
        ...(dto.lowStockAlerts !== undefined
          ? { lowStockAlerts: dto.lowStockAlerts }
          : {}),
        ...(dto.aiDecisionSupport !== undefined
          ? { aiDecisionSupport: dto.aiDecisionSupport }
          : {}),
        ...(dto.darkMode !== undefined ? { darkMode: dto.darkMode } : {}),
      },
      include: { logos: true },
    });

    if (userId) {
      await this.auditService.log({
        entityType: 'CompanySetting',
        entityId: updated.id,
        action: 'COMPANY_SETTINGS_UPDATED',
        userId,
        changes: { ...(dto as object) },
      });
    }

    await this.invalidateSettingsCache();
    return this.toSettingsResponse(updated, updated.logos);
  }

  async convertCurrency(
    query: ConvertCurrencyQueryDto,
  ): Promise<ConvertCurrencyResponseDto> {
    const settings = await this.ensureSettings();
    const rate = decimalToNumber(settings.eurToMgaRate);
    const from = normalizeCurrency(query.from ?? DEFAULT_CURRENCY);
    const to = normalizeCurrency(query.to ?? 'EUR');

    return {
      amount: query.amount,
      from,
      convertedAmount: convertAmount(query.amount, from, to, rate),
      to,
      eurToMgaRate: rate,
    };
  }

  parseLogoKind(raw: string): CompanyLogoKindParam {
    const kind = raw.trim().toLowerCase() as CompanyLogoKindParam;
    if (!COMPANY_LOGO_KINDS.includes(kind)) {
      throw new BadRequestException(
        `Kind de logo invalide: ${raw}. Attendu: ${COMPANY_LOGO_KINDS.join(', ')}`,
      );
    }
    return kind;
  }

  /**
   * Upload ou remplacement (1 fichier actif / kind).
   * GED: admin/company-setting/{id}/logo_{kind}/yyyy/mm/dd/v{n}/...
   */
  async upsertLogo(
    kindParam: string,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<CompanyLogoResponseDto> {
    const kind = this.parseLogoKind(kindParam);
    this.assertLogoFile(file);

    const settings = await this.ensureSettings();
    const prismaKind = KIND_TO_PRISMA[kind];
    const existing = await this.prisma.companyLogo.findUnique({
      where: {
        companySettingId_kind: {
          companySettingId: settings.id,
          kind: prismaKind,
        },
      },
    });

    const nextVersion =
      (existing
        ? this.extractVersion(existing.objectKey ?? existing.storagePath)
        : 0) + 1;

    // Logos: pas de gzip — URL signees MinIO utilisables directement en preview navigateur.
    const storedBuffer = file.buffer;
    const algo = 'NONE' as const;

    const objectKey = this.gedPathsService.buildObjectKey({
      domain: 'admin',
      entityType: 'company-setting',
      entityId: settings.id,
      documentType: COMPANY_LOGO_GED_DOCUMENT_TYPE[kind],
      originalFileName: file.originalname,
      version: nextVersion,
    });

    let bucket: string | null = null;
    let persistedObjectKey: string | null = null;
    let storagePath: string | null = null;

    if (this.minioService.isEnabled()) {
      bucket = DEFAULT_GED_BUCKET_RAW;
      persistedObjectKey = objectKey;
      await this.minioService.putObject({
        bucket,
        key: objectKey,
        body: storedBuffer,
        contentType: file.mimetype,
        contentEncoding: algo === 'GZIP' ? 'gzip' : undefined,
      });
    } else {
      storagePath = join(process.cwd(), 'uploads', 'ged', objectKey);
      await mkdir(dirname(storagePath), { recursive: true });
      await writeFile(storagePath, storedBuffer);
    }

    if (existing) {
      await this.removeStoredObject(existing);
      const updated = await this.prisma.companyLogo.update({
        where: { id: existing.id },
        data: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          bucket,
          objectKey: persistedObjectKey,
          storagePath,
          originalSize: file.size,
          compressedSize: storedBuffer.length,
          compressionAlgo: algo,
          uploadedById: userId,
        },
      });
      await this.invalidateSettingsCache();
      return this.toLogoResponse(updated);
    }

    const created = await this.prisma.companyLogo.create({
      data: {
        companySettingId: settings.id,
        kind: prismaKind,
        originalName: file.originalname,
        mimeType: file.mimetype,
        bucket,
        objectKey: persistedObjectKey,
        storagePath,
        originalSize: file.size,
        compressedSize: storedBuffer.length,
        compressionAlgo: algo,
        uploadedById: userId,
      },
    });

    await this.invalidateSettingsCache();
    return this.toLogoResponse(created);
  }

  async deleteLogo(kindParam: string): Promise<DeleteCompanyLogoResponseDto> {
    const kind = this.parseLogoKind(kindParam);
    const settings = await this.ensureSettings();
    const existing = await this.prisma.companyLogo.findUnique({
      where: {
        companySettingId_kind: {
          companySettingId: settings.id,
          kind: KIND_TO_PRISMA[kind],
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Aucun logo « ${kind} » configuré`);
    }

    await this.removeStoredObject(existing);
    await this.prisma.companyLogo.delete({ where: { id: existing.id } });
    await this.invalidateSettingsCache();

    return { kind, deleted: true };
  }

  /** Binary du slot exact (sans fallback). */
  async getLogoBinary(kindParam: string) {
    const kind = this.parseLogoKind(kindParam);
    const settings = await this.ensureSettings();
    const logo = await this.prisma.companyLogo.findUnique({
      where: {
        companySettingId_kind: {
          companySettingId: settings.id,
          kind: KIND_TO_PRISMA[kind],
        },
      },
    });

    if (!logo) {
      throw new NotFoundException(`Aucun logo « ${kind} » configuré`);
    }

    return this.readLogoBinary(logo);
  }

  /**
   * Binary effectif pour un canal: override du kind, sinon PRIMARY, sinon null.
   * PRIMARY ne fallback jamais.
   */
  async resolveLogoBinary(kindParam: string) {
    const kind = this.parseLogoKind(kindParam);
    const settings = await this.ensureSettings();
    const logos = await this.prisma.companyLogo.findMany({
      where: { companySettingId: settings.id },
    });
    const byKind = new Map(logos.map((l) => [PRISMA_TO_KIND[l.kind], l]));

    const direct = byKind.get(kind);
    if (direct) {
      return this.readLogoBinary(direct);
    }

    if (kind !== 'primary') {
      const primary = byKind.get('primary');
      if (primary) {
        return this.readLogoBinary(primary);
      }
    }

    return null;
  }

  /** Data-URI pour embarquer le logo (preview HTML / emails). */
  async resolveLogoDataUri(
    kindParam: CompanyLogoKindParam = 'invoice',
  ): Promise<string | null> {
    const binary = await this.resolveLogoBinary(kindParam);
    if (!binary) {
      return null;
    }
    return `data:${binary.mimeType};base64,${binary.buffer.toString('base64')}`;
  }

  private async invalidateSettingsCache() {
    await this.cache.del(CACHE_KEYS.companySettings);
  }

  private async ensureSettings() {
    const existing = await this.prisma.companySetting.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.companySetting.create({
      data: {
        companyName: DEFAULT_COMPANY_NAME,
        defaultCurrency: DEFAULT_CURRENCY,
        eurToMgaRate: DEFAULT_EUR_TO_MGA_RATE,
      },
    });
  }

  private assertLogoFile(file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu. Champ attendu: file');
    }
    if (
      !COMPANY_LOGO_ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof COMPANY_LOGO_ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Type MIME non autorisé: ${file.mimetype}. Autorisés: ${COMPANY_LOGO_ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }
    if (file.size > COMPANY_LOGO_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${COMPANY_LOGO_MAX_FILE_SIZE_BYTES / (1024 * 1024)} Mo)`,
      );
    }
  }

  private async readLogoBinary(logo: CompanyLogo) {
    let storedBuffer: Buffer;
    if (logo.bucket && logo.objectKey && this.minioService.isEnabled()) {
      storedBuffer = await this.minioService.getObjectAsBuffer({
        bucket: logo.bucket,
        key: logo.objectKey,
      });
    } else if (logo.storagePath) {
      storedBuffer = await readFile(logo.storagePath);
    } else {
      throw new NotFoundException('Fichier logo indisponible');
    }

    return {
      originalName: logo.originalName,
      mimeType: logo.mimeType,
      buffer: decompressBufferIfNeeded(storedBuffer, logo.compressionAlgo),
    };
  }

  private async toSettingsResponse(
    settings: {
      id: string;
      companyName: string;
      siret: string | null;
      vatNumber: string | null;
      iban: string | null;
      addressLine: string | null;
      city: string | null;
      postalCode: string | null;
      country: string | null;
      cgvText: string | null;
      defaultCurrency: string;
      eurToMgaRate: unknown;
      autoSendInvoices: boolean;
      lowStockAlerts: boolean;
      aiDecisionSupport: boolean;
      darkMode: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    logos: CompanyLogo[],
  ): Promise<CompanySettingsResponseDto> {
    const responses = await Promise.all(
      logos.map(async (logo) => {
        const dto = await this.toLogoResponse(logo);
        return [PRISMA_TO_KIND[logo.kind], dto] as const;
      }),
    );
    const byKind = new Map(responses);
    const primary = byKind.get('primary') ?? null;

    const logoSlots: CompanyLogoSlotDto[] = COMPANY_LOGO_KINDS.map((kind) => {
      const logo = byKind.get(kind) ?? null;
      const fallsBackToPrimary = !logo && kind !== 'primary' && primary !== null;
      return {
        kind,
        logo,
        resolved: logo ?? (kind === 'primary' ? null : primary),
        fallsBackToPrimary,
      };
    });

    return {
      id: settings.id,
      companyName: settings.companyName,
      siret: settings.siret,
      vatNumber: settings.vatNumber,
      iban: settings.iban,
      addressLine: settings.addressLine,
      city: settings.city,
      postalCode: settings.postalCode,
      country: settings.country,
      cgvText: settings.cgvText,
      defaultCurrency: settings.defaultCurrency,
      eurToMgaRate: decimalToNumber(settings.eurToMgaRate),
      autoSendInvoices: settings.autoSendInvoices,
      lowStockAlerts: settings.lowStockAlerts,
      aiDecisionSupport: settings.aiDecisionSupport,
      darkMode: settings.darkMode,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
      logoSlots,
    };
  }

  private async toLogoResponse(
    logo: CompanyLogo,
  ): Promise<CompanyLogoResponseDto> {
    const kind = PRISMA_TO_KIND[logo.kind];
    const url = `/company-settings/logos/${kind}`;
    return {
      id: logo.id,
      companySettingId: logo.companySettingId,
      kind,
      originalName: logo.originalName,
      mimeType: logo.mimeType,
      bucket: logo.bucket,
      objectKey: logo.objectKey,
      storagePath: logo.storagePath,
      originalSize: logo.originalSize,
      compressedSize: logo.compressedSize,
      compressionAlgo: logo.compressionAlgo,
      uploadedById: logo.uploadedById,
      createdAt: logo.createdAt,
      updatedAt: logo.updatedAt,
      version: this.extractVersion(logo.objectKey ?? logo.storagePath),
      url,
      previewUrl: await this.buildLogoPreviewUrl(logo, url),
    };
  }

  /**
   * Lien utilisable dans un navigateur / <img> sans header JWT.
   * Prefere une URL MinIO pre-signee ; sinon URL API absolue (JWT requis).
   */
  private async buildLogoPreviewUrl(
    logo: CompanyLogo,
    relativeUrl: string,
  ): Promise<string> {
    if (logo.bucket && logo.objectKey && this.minioService.isEnabled()) {
      try {
        // Ne pas forcer ResponseContentType si l'objet est gzippe :
        // MinIO doit renvoyer Content-Encoding pour que le navigateur decompress.
        const isGzip = logo.compressionAlgo === 'GZIP';
        return await this.minioService.getSignedDownloadUrl({
          bucket: logo.bucket,
          key: logo.objectKey,
          expiresInSeconds: 3600,
          ...(isGzip ? {} : { responseContentType: logo.mimeType }),
          inline: true,
        });
      } catch {
        // fallback absolu API ci-dessous
      }
    }

    return this.toAbsoluteApiUrl(relativeUrl);
  }

  private toAbsoluteApiUrl(path: string): string {
    const base = (
      process.env.PUBLIC_API_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    ).replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private extractVersion(pathLike?: string | null): number {
    if (!pathLike) return 1;
    const match = pathLike.match(/\/v(\d+)\//);
    return match ? Number(match[1]) : 1;
  }

  private async removeStoredObject(logo: {
    bucket: string | null;
    objectKey: string | null;
    storagePath: string | null;
  }) {
    if (logo.bucket && logo.objectKey && this.minioService.isEnabled()) {
      await this.minioService.removeObject({
        bucket: logo.bucket,
        key: logo.objectKey,
      });
      return;
    }

    if (logo.storagePath) {
      await unlink(logo.storagePath).catch(() => undefined);
    }
  }
}
