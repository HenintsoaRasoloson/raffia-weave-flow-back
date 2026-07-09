import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    const existing = await this.prisma.companySetting.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.companySetting.create({
      data: {
        companyName: 'Atelier Raphia',
      },
    });
  }

  async updateSettings(dto: UpdateCompanySettingsDto) {
    const current = await this.getSettings();

    return this.prisma.companySetting.update({
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
    });
  }
}
