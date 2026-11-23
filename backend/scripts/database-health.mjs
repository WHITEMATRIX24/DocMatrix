import { PrismaClient } from '@prisma/client';
import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const db = new PrismaClient();
try {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const migrations = await tx.$queryRaw`SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name`;
    const mismatches = await tx.$queryRaw`SELECT i.id, i."clinicId", i.sku, i."totalStock" AS stored, COALESCE(SUM(b.quantity),0)::int AS batches
      FROM "InventoryItem" i LEFT JOIN "InventoryBatch" b ON b."itemId"=i.id AND b."clinicId"=i."clinicId"
      GROUP BY i.id HAVING i."totalStock" <> COALESCE(SUM(b.quantity),0)`;
    const columns = process.argv.includes('--schema') ? await tx.$queryRaw`SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default
      FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('IntegrationMapping','AccountingOutbox') ORDER BY table_name,ordinal_position` : undefined;
    const enums = process.argv.includes('--schema') ? await tx.$queryRaw`SELECT t.typname,e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname IN ('IntegrationProvider','IntegrationSyncStatus','AccountingEventType') ORDER BY t.typname,e.enumsortorder` : undefined;
    const constraints = process.argv.includes('--schema') ? await tx.$queryRaw`SELECT c.relname,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid WHERE c.relname IN ('IntegrationMapping','AccountingOutbox')` : undefined;
    const indexes = process.argv.includes('--schema') ? await tx.$queryRaw`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('IntegrationMapping','AccountingOutbox')` : undefined;
    return { migrations, mismatches, columns, enums, constraints, indexes };
  });
  const root = fileURLToPath(new URL('../prisma/migrations/', import.meta.url));
  const local = await readdir(root, { withFileTypes: true });
  const names = new Set(local.filter(entry => entry.isDirectory()).map(entry => entry.name));
  const appliedWithoutSource = result.migrations.filter(m => m.finished_at && !m.rolled_back_at && !names.has(m.migration_name)).map(m => m.migration_name);
  const applied = new Set(result.migrations.filter(m => m.finished_at && !m.rolled_back_at).map(m => m.migration_name));
  const legacy = JSON.parse(await readFile(fileURLToPath(new URL('../prisma/legacy-migrations.json', import.meta.url)), 'utf8'));
  const acknowledgedLegacySources = appliedWithoutSource.filter(name => {
    const entry = legacy[name];
    return entry && applied.has(entry.reconciledBy) && result.migrations.some(m => m.migration_name === name && m.checksum === entry.checksum);
  });
  const unknownMissingSources = appliedWithoutSource.filter(name => !acknowledgedLegacySources.includes(name));
  const pending = [...names].filter(name => !applied.has(name));
  const checksumMismatches = [];
  for (const migration of result.migrations) {
    if (!names.has(migration.migration_name)) continue;
    const sql = await readFile(`${root}/${migration.migration_name}/migration.sql`);
    if (createHash('sha256').update(sql).digest('hex') !== migration.checksum) checksumMismatches.push(migration.migration_name);
  }
  console.log(JSON.stringify({ appliedWithoutSource, acknowledgedLegacySources, unknownMissingSources, pending, checksumMismatches,
    unfinished: result.migrations.filter(m => !m.finished_at && !m.rolled_back_at).map(m => m.migration_name),
    inventoryMismatches: result.mismatches, columns: result.columns, enums: result.enums, constraints: result.constraints, indexes: result.indexes }, null, 2));
  if (unknownMissingSources.length || pending.length || checksumMismatches.length || result.mismatches.length) process.exitCode = 1;
} catch (error) { console.error('Database health check failed:', error.code || error.constructor.name); process.exitCode = 1; }
finally { await db.$disconnect(); }
