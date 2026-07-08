import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Missing DATABASE_URL environment variable.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Administrator';

  if (!email || !password) {
    throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        name,
        isAdmin: true,
        passwordHash,
      },
    });

    console.log(`Admin user updated for ${email}.`);
    return;
  }

  await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      isAdmin: true,
      passwordHash,
    },
  });

  console.log(`Admin user created for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });