import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function lockTenantRecord(
  tx: Prisma.TransactionClient,
  table: 'Invoice' | 'ClinicalNote' | 'Prescription' | 'TreatmentPlan',
  clinicId: string,
  id: string,
): Promise<void> {
  const alternate =
    table === 'Invoice'
      ? Prisma.sql` OR "invoiceNumber" = ${id}`
      : Prisma.empty;
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM ${Prisma.raw(`"${table}"`)}
    WHERE "clinicId" = ${clinicId} AND ("id" = ${id}${alternate}) FOR UPDATE
  `);
  if (!rows.length)
    throw new NotFoundException('Record not found in this clinic.');
}

export async function lockInventoryItems(
  tx: Prisma.TransactionClient,
  clinicId: string,
  identifiers: string[],
): Promise<void> {
  const values = [...new Set(identifiers)].sort();
  if (!values.length) return;
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "InventoryItem" WHERE "clinicId" = ${clinicId}
    AND ("id" IN (${Prisma.join(values)}) OR "sku" IN (${Prisma.join(values)}))
    ORDER BY "id" FOR UPDATE
  `);
}
