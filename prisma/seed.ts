import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../src/generated/prisma/client';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_CURRENCY,
  DEFAULT_EUR_TO_MGA_RATE,
} from '../src/company-settings/company-settings.constants';
import { DEFAULT_LEDGER_CATEGORIES } from '../src/financial-tracking/financial-categories.seed';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type SeedUser = {
  email: string;
  name: string;
  role: UserRole;
  isAdmin: boolean;
};

const BASE_CATEGORIES = [
  { name: 'Cabas', code: 'CAB' },
  { name: 'Tote', code: 'TOT' },
  { name: 'Panier', code: 'PAN' },
  { name: 'Pochette', code: 'POC' },
  { name: 'Sac à dos', code: 'DOS' },
  { name: 'Mini', code: 'MIN' },
] as const;

const BASE_COLORS = [
  { name: 'Naturel', hex: '#E8D8B8' },
  { name: 'Terracotta', hex: '#C4654A' },
  { name: 'Sauge', hex: '#87A878' },
  { name: 'Noir charbon', hex: '#2D2A26' },
  { name: 'Sable', hex: '#C9B99A' },
  { name: 'Indigo', hex: '#3B5269' },
] as const;

function envOr(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function toSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function resolveSeedUsers(): SeedUser[] {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error('Missing ADMIN_EMAIL environment variable.');
  }

  return [
    {
      email: adminEmail,
      name: envOr('ADMIN_NAME', 'Gérant'),
      role: UserRole.GERANT,
      isAdmin: true,
    },
    {
      email: envOr('SEED_GENERAL_EMAIL', 'general@raffia.test').toLowerCase(),
      name: 'Responsable général',
      role: UserRole.RESPONSABLE_GENERAL,
      isAdmin: false,
    },
    {
      email: envOr(
        'SEED_PRODUCTION_EMAIL',
        'production@raffia.test',
      ).toLowerCase(),
      name: 'Responsable production',
      role: UserRole.RESPONSABLE_PRODUCTION,
      isAdmin: false,
    },
    {
      email: envOr(
        'SEED_LIVRAISON_EMAIL',
        'livraison@raffia.test',
      ).toLowerCase(),
      name: 'Responsable livraison',
      role: UserRole.RESPONSABLE_LIVRAISON,
      isAdmin: false,
    },
    {
      email: envOr('SEED_FINANCE_EMAIL', 'finance@raffia.test').toLowerCase(),
      name: 'Responsable financier / stocks',
      role: UserRole.RESPONSABLE_FINANCIER_STOCKS,
      isAdmin: false,
    },
  ];
}

async function seedUsers() {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Missing ADMIN_PASSWORD environment variable.');
  }

  const otherPassword = envOr('SEED_PASSWORD', adminPassword);
  const users = resolveSeedUsers();
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const otherHash =
    otherPassword === adminPassword
      ? adminHash
      : await bcrypt.hash(otherPassword, 10);

  for (const user of users) {
    const passwordHash = user.isAdmin ? adminHash : otherHash;
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
        passwordHash,
      },
      update: {
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
        passwordHash,
      },
    });
  }

  return users;
}

async function seedCompanySettings() {
  const existing = await prisma.companySetting.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (existing) {
    return;
  }

  await prisma.companySetting.create({
    data: {
      companyName: DEFAULT_COMPANY_NAME,
      defaultCurrency: DEFAULT_CURRENCY,
      eurToMgaRate: DEFAULT_EUR_TO_MGA_RATE,
    },
  });
}

async function seedCategories() {
  for (const category of BASE_CATEGORIES) {
    const slug = toSlug(category.name);
    const existing = await prisma.category.findFirst({
      where: { OR: [{ code: category.code }, { slug }] },
    });

    if (existing) {
      continue;
    }

    await prisma.category.create({
      data: {
        name: category.name,
        code: category.code,
        slug,
      },
    });
  }
}

async function seedColors() {
  for (const color of BASE_COLORS) {
    await prisma.color.upsert({
      where: {
        name_hex: {
          name: color.name,
          hex: color.hex,
        },
      },
      create: {
        name: color.name,
        hex: color.hex,
        active: true,
      },
      update: {
        active: true,
      },
    });
  }
}

async function seedLedgerCategories() {
  for (const category of DEFAULT_LEDGER_CATEGORIES) {
    await prisma.ledgerCategory.upsert({
      where: { code: category.code },
      create: {
        ...category,
        isSystem: true,
        active: true,
      },
      update: {
        name: category.name,
        entryType: category.entryType,
        description: category.description,
        isSystem: true,
        active: true,
      },
    });
  }
}

async function main() {
  const users = await seedUsers();
  await seedCompanySettings();
  await seedCategories();
  await seedColors();
  await seedLedgerCategories();

  console.log('Seed completed.');
  console.log('Comptes de base :');
  for (const user of users) {
    const adminFlag = user.isAdmin ? ' (isAdmin)' : '';
    console.log(`  - ${user.email}  ${user.role}${adminFlag}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
