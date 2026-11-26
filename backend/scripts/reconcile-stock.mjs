// Default: read-only preview. --apply requires an operator-reviewed expected-value plan.
import { PrismaClient, Prisma } from '@prisma/client';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { userInfo } from 'node:os';
const planPath = resolve(process.argv[2] || '');
const plan = JSON.parse(await readFile(planPath, 'utf8'));
const apply = process.argv.includes('--apply');
if (plan.basis !== 'physically-verified-batches-no-unbatched-opening-stock' || !plan.clinicId || !Array.isArray(plan.items) || !plan.items.length) throw new Error('A physically verified stock plan is required.');
if (new Set(plan.items.map(i => i.id)).size !== plan.items.length || plan.items.some(i => !i.id || !Number.isInteger(i.stored) || !Number.isInteger(i.batches) || i.batches < 0)) throw new Error('Invalid expected stock values.');
const db = new PrismaClient();
try {
  const result = await db.$transaction(async tx => {
    if (!apply) await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const result = [];
    for (const expected of [...plan.items].sort((a,b) => a.id.localeCompare(b.id))) {
      if (apply) await tx.$queryRaw(Prisma.sql`SELECT id FROM "InventoryItem" WHERE id=${expected.id} AND "clinicId"=${plan.clinicId} FOR UPDATE`);
      const item = await tx.inventoryItem.findFirst({ where: { id: expected.id, clinicId: plan.clinicId }, include: { batches: true } });
      if (!item) throw new Error('Planned inventory item no longer exists in the clinic.');
      const actual = item.batches.reduce((sum,b) => sum + b.quantity, 0);
      if (item.totalStock !== expected.stored || actual !== expected.batches || item.sku !== expected.sku) throw new Error('Stock changed since review; transaction aborted. Prepare a fresh plan.');
      const auditId = randomUUID();
      if (apply) {
        await tx.inventoryItem.update({ where: { id: item.id }, data: { totalStock: actual } });
        await tx.auditEvent.create({ data: { id: auditId, clinicId: plan.clinicId, module: 'Inventory', action: 'PHYSICAL_STOCK_RECONCILED', actorName: userInfo().username, actorRole: 'AUTHORIZED_OPERATOR', description: 'Operator confirmed batch quantities match physical stock and no opening stock is unbatched.', severity: 'warn', outcome: 'SUCCESS', metadata: { itemId: item.id, sku: item.sku, previousTotal: expected.stored, verifiedTotal: actual, batches: item.batches.map(b => ({ id: b.id, quantity: b.quantity })), basis: plan.basis } } });
      }
      result.push({ sku: item.sku, before: item.totalStock, after: actual, ...(apply ? { auditId } : {}) });
    }
    return result;
  }, { timeout: 30000, maxWait: 10000 });
  if (apply) await writeFile(`${planPath}.result.json`, JSON.stringify({ appliedAt: new Date().toISOString(), items: result }, null, 2));
  console.log(JSON.stringify({ applied: apply, items: result }, null, 2));
} catch (error) { console.error(error.code || error.message); process.exitCode = 1; }
finally { await db.$disconnect(); }
