const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

const envPath = path.join(__dirname, '../backend/.env');
const env = fs.readFileSync(envPath, 'utf-8');
const line = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const val = line.substring(13).trim().replace(/^['"]|['"]$/g, '');

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: val } } });
  const migrations = await prisma.$queryRawUnsafe('SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC;');
  console.log('Applied migrations in neondb:', migrations);
  await prisma.$disconnect();
}

main();
