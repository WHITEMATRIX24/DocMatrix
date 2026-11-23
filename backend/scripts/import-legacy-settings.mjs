import 'reflect-metadata';
// Run from backend after building and migrating. Default is a read-only preview.
// --apply imports only into empty database settings; source files are retained.
import { PrismaClient } from '@prisma/client';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { ClinicalConfigDto } from '../dist/clinics/dto/clinical-config.dto.js';
import { UpdateClinicDto } from '../dist/clinics/dto/update-clinic.dto.js';
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
try {
  for (const [directory, field, dto] of [['clinic-settings', 'extendedSettings', UpdateClinicDto], ['clinical-config', 'clinicalConfig', ClinicalConfigDto]]) {
    const root = resolve('storage', directory);
    const entries = await readdir(root, { withFileTypes: true }).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error));
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json') || basename(entry.name) !== entry.name) continue;
      const clinicId = entry.name.slice(0, -5);
      const exists = await db.clinic.findUnique({ where: { id: clinicId }, select: { id: true } });
      if (!exists) {
        console.log(JSON.stringify({ clinicId, field, action: 'skip unknown clinic; source retained' }));
        continue;
      }
      const settings = JSON.parse(await readFile(resolve(root, entry.name), 'utf8'));
      await validateOrReject(plainToInstance(dto, settings), { whitelist: true, forbidNonWhitelisted: true });
      await db.$transaction(async tx => {
        if (!apply) await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
        const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });
        if (!clinic) throw new Error(`Unknown clinic in ${directory}`);
        const empty = Object.keys(clinic[field] || {}).length === 0;
        console.log(JSON.stringify({ clinicId, field, action: empty ? (apply ? 'import' : 'would import') : 'preserve existing database settings' }));
        if (apply && empty) {
          if (field === 'clinicalConfig') {
            for (const entry of [...(settings.customMedicines || []), ...(settings.customProcedures || []), ...(settings.customDiagnoses || [])]) if (!entry.name?.trim()) throw new Error('A legacy catalogue entry has no name.');
            for (const entry of settings.customTemplates || []) if (!entry.title?.trim()) throw new Error('A legacy template has no title.');
            for (const procedure of settings.customProcedures || []) {
              const fee = Number(String(procedure.fee ?? procedure.price ?? '').replace(/[Ã¢â€šÂ¹,\s]/g, ''));
              if (!Number.isFinite(fee) || fee < 0 || fee > 99999999) throw new Error('A legacy procedure fee requires review.');
              await tx.serviceTariff.upsert({ where: { clinicId_name: { clinicId, name: procedure.name.trim() } }, create: { clinicId, name: procedure.name.trim(), code: procedure.code, category: procedure.category || 'General', standardFee: fee }, update: {} });
            }
          }
          await tx.clinic.update({ where: { id: clinicId }, data: { [field]: settings } });
        }
      });
    }
  }
} finally { await db.$disconnect(); }
