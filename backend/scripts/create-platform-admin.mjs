import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

export async function provisionPlatformAdmin(prisma, { email, password, fullName }) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== 'string' || password.length < 16 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Explicit bootstrap email and password (16+ characters, maximum 72 UTF-8 bytes) are required.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } })) {
    throw new Error('Account already exists. Bootstrap cannot reset or elevate an existing account.');
  }
  return prisma.user.create({ data: {
    email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12),
    fullName: fullName?.trim() || 'DocMatrix Platform Admin', role: 'ORGANIZATION_ADMIN',
    isPlatformAdmin: true, isPrimaryContact: false, isActive: true, clinicId: null,
  }, select: { id: true } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await provisionPlatformAdmin(prisma, {
      email: process.env.DOCMATRIX_BOOTSTRAP_EMAIL,
      password: process.env.DOCMATRIX_BOOTSTRAP_PASSWORD,
      fullName: process.env.DOCMATRIX_BOOTSTRAP_NAME,
    });
    console.log('PLATFORM_ADMIN_CREATED');
  } catch {
    console.error('PLATFORM_ADMIN_BOOTSTRAP_FAILED: Verify explicit credentials and use a new account.');
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
