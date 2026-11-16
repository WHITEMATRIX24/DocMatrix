import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase() || 'admin@docmatrix.com';
  const password = process.argv[3] || 'Admin@DocMatrix2026!';
  const fullName = process.argv[4] || 'DocMatrix Platform Admin';

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      isPlatformAdmin: true,
      isActive: true,
      passwordHash,
      fullName,
    },
    create: {
      email,
      fullName,
      passwordHash,
      role: 'ORGANIZATION_ADMIN',
      isPlatformAdmin: true,
      isPrimaryContact: false,
      isActive: true,
      clinicId: null,
    },
  });

  console.log('PLATFORM_ADMIN_CREATED');
  console.log(JSON.stringify({
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    role: admin.role,
    isPlatformAdmin: admin.isPlatformAdmin,
    clinicId: admin.clinicId,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error('FAILED_TO_CREATE_PLATFORM_ADMIN', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
