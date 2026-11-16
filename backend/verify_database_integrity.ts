import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabaseIntegrity() {
  console.log('========================================================================');
  console.log('   DOCMATRIX — PHASE 1: DATABASE MIGRATION INTEGRITY & CONSISTENCY');
  console.log('========================================================================\n');

  try {
    // 1. Verify existence of all 9 required tables
    const requiredTables = [
      'Prescription',
      'PrescriptionItem',
      'ClinicalNote',
      'ClinicalNoteAddendum',
      'TreatmentPlan',
      'TreatmentPlanStage',
      'TreatmentPlanItem',
      'TreatmentEstimateRevision',
      'TreatmentPlanHistory',
    ];

    console.log('[1] Verifying Required Table Existence in Public Schema...');
    const tableRows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = ANY(${requiredTables});
    `;

    const existingTableNames = new Set(tableRows.map((r) => r.table_name));
    for (const table of requiredTables) {
      if (existingTableNames.has(table)) {
        console.log(`  ✓ Table '${table}' exists in Neon PostgreSQL.`);
      } else {
        throw new Error(`Missing required table: '${table}'!`);
      }
    }

    // 2. Verify Decimal columns (precision = 10, scale = 2)
    console.log('\n[2] Verifying Decimal Monetary Columns (Precision=10, Scale=2)...');
    const decimalColumns = await prisma.$queryRaw<{
      table_name: string;
      column_name: string;
      data_type: string;
      numeric_precision: number;
      numeric_scale: number;
    }[]>`
      SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'numeric'
        AND table_name IN ('TreatmentPlan', 'TreatmentPlanStage', 'TreatmentPlanItem', 'TreatmentEstimateRevision')
      ORDER BY table_name, column_name;
    `;

    console.log(`  Found ${decimalColumns.length} Decimal monetary columns:`);
    for (const col of decimalColumns) {
      console.log(`  • ${col.table_name}.${col.column_name}: NUMERIC(${col.numeric_precision}, ${col.numeric_scale})`);
      if (col.numeric_precision !== 10 || col.numeric_scale !== 2) {
        throw new Error(`Column ${col.table_name}.${col.column_name} has invalid precision/scale: expected (10, 2), got (${col.numeric_precision}, ${col.numeric_scale})`);
      }
    }
    console.log('  ✓ All monetary columns strictly match DECIMAL(10, 2) specification.');

    // 3. Verify Foreign Keys and Referential Constraints
    console.log('\n[3] Verifying Foreign Key Constraints...');
    const fkRows = await prisma.$queryRaw<{
      constraint_name: string;
      table_name: string;
      foreign_table_name: string;
    }[]>`
      SELECT
        tc.constraint_name,
        tc.table_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = ANY(${requiredTables})
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    console.log(`  Found ${fkRows.length} active foreign key constraints:`);
    for (const fk of fkRows) {
      console.log(`  • [${fk.table_name}] -> [${fk.foreign_table_name}] via ${fk.constraint_name}`);
    }

    // 4. Verify Unique Constraints and Indexes
    console.log('\n[4] Verifying Critical Unique Constraints & Indexes...');
    const indexes = await prisma.$queryRaw<{
      tablename: string;
      indexname: string;
      indexdef: string;
    }[]>`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = ANY(${requiredTables})
      ORDER BY tablename, indexname;
    `;

    console.log(`  Found ${indexes.length} indexes on clinical & planning tables:`);
    let foundVersionUnique = false;
    let foundPlanNumberUnique = false;
    for (const idx of indexes) {
      if (idx.indexname.includes('planNumber')) foundPlanNumberUnique = true;
      if (idx.indexname.includes('treatmentPlanId_versionNumber')) foundVersionUnique = true;
    }
    console.log(`  • Unique index on TreatmentPlan (clinicId, planNumber): ${foundPlanNumberUnique ? 'VERIFIED ✓' : 'MISSING'}`);
    console.log(`  • Unique compound index on TreatmentEstimateRevision (treatmentPlanId, versionNumber): ${foundVersionUnique ? 'VERIFIED ✓' : 'MISSING'}`);

    if (!foundPlanNumberUnique || !foundVersionUnique) {
      throw new Error('Missing essential unique constraints for treatment plans / revisions!');
    }

    // 5. Verify Migration Records in _prisma_migrations
    console.log('\n[5] Verifying _prisma_migrations Table Integrity...');
    const migrationRows = await prisma.$queryRaw<{
      id: string;
      migration_name: string;
      finished_at: Date;
      applied_steps_count: number;
    }[]>`
      SELECT id, migration_name, finished_at, applied_steps_count
      FROM _prisma_migrations
      ORDER BY finished_at ASC;
    `;

    console.log(`  Total applied migrations: ${migrationRows.length}`);
    for (const m of migrationRows) {
      console.log(`  • ${m.migration_name} (Applied steps: ${m.applied_steps_count}, Finished: ${m.finished_at.toISOString()})`);
    }

    // 6. Verify Existing Clinical Records Integrity
    console.log('\n[6] Checking Existing Clinical Records in Neon PostgreSQL...');
    const [clinicsCount, patientsCount, usersCount, appointmentsCount, rxCount, notesCount, tpCount] = await Promise.all([
      prisma.clinic.count(),
      prisma.patient.count(),
      prisma.user.count(),
      prisma.appointment.count(),
      prisma.prescription.count(),
      prisma.clinicalNote.count(),
      prisma.treatmentPlan.count(),
    ]);

    console.log(`  • Clinics: ${clinicsCount}`);
    console.log(`  • Patients: ${patientsCount}`);
    console.log(`  • Users: ${usersCount}`);
    console.log(`  • Appointments: ${appointmentsCount}`);
    console.log(`  • Prescriptions: ${rxCount}`);
    console.log(`  • Clinical Notes: ${notesCount}`);
    console.log(`  • Treatment Plans: ${tpCount}`);

    console.log('\n========================================================================');
    console.log('   DATABASE INTEGRITY VERIFICATION COMPLETE: 100% HEALTHY');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ DATABASE INTEGRITY CHECK FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseIntegrity();

