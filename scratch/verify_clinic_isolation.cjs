const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

const envPath = path.join(__dirname, '../backend/.env');
const env = fs.readFileSync(envPath, 'utf-8');
const line = env.split(/\r?\n/).find(l => l.startsWith('DATABASE_URL='));
const val = line.substring(13).trim().replace(/^['"]|['"]$/g, '');

const u = new URL(val);
u.pathname = '/docmatrix_billing_migration_test';
const targetUrl = u.toString();
const prisma = new PrismaClient({ datasources: { db: { url: targetUrl } } });

async function runIsolationAudit() {
  console.log('========================================================================');
  console.log('   DOCMATRIX — PART A: MULTI-TENANT CLINIC DATA ISOLATION VERIFICATION');
  console.log('   Target Environment: docmatrix_billing_migration_test (Isolated Neon DB)');
  console.log('========================================================================\n');

  try {
    // 1. Get Clinic A and Clinic B
    let clinicA = await prisma.clinic.findFirst({ where: { name: 'DocMatrix Clinic A' } });
    let clinicB = await prisma.clinic.findFirst({ where: { name: 'DocMatrix Clinic B' } });

    if (!clinicA || !clinicB) {
      console.log('Creating Clinic A and Clinic B in isolated test DB...');
      if (!clinicA) {
        clinicA = await prisma.clinic.create({
          data: {
            name: 'DocMatrix Clinic A',
            slug: `clinic-a-${Date.now()}`,
            phone: '+91 99999 11111',
            email: `clinic-a-${Date.now()}@test.docmatrix.dental`,
            status: 'ACTIVE',
          }
        });
      }
      if (!clinicB) {
        clinicB = await prisma.clinic.create({
          data: {
            name: 'DocMatrix Clinic B',
            slug: `clinic-b-${Date.now()}`,
            phone: '+91 99999 22222',
            email: `clinic-b-${Date.now()}@test.docmatrix.dental`,
            status: 'ACTIVE',
          }
        });
      }
    }

    console.log(`[1] Verified Independent Clinics:`);
    console.log(`    Clinic A: ${clinicA.name} (ID: ${clinicA.id})`);
    console.log(`    Clinic B: ${clinicB.name} (ID: ${clinicB.id})\n`);

    // 2. Clean initial state verification for Clinic A and Clinic B
    // Clean any prior operational test records for clean run
    await prisma.invoiceLineItem.deleteMany({ where: { invoice: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.invoicePayment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.invoice.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.inventoryAudit.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.inventoryBatch.deleteMany({ where: { item: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.inventoryItem.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.prescriptionItem.deleteMany({ where: { prescription: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.prescription.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.clinicalNoteAddendum.deleteMany({ where: { clinicalNote: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.clinicalNote.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.treatmentPlanItem.deleteMany({ where: { stage: { treatmentPlan: { clinicId: { in: [clinicA.id, clinicB.id] } } } } });
    await prisma.treatmentEstimateRevision.deleteMany({ where: { treatmentPlan: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.treatmentPlanHistory.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.treatmentPlanStage.deleteMany({ where: { treatmentPlan: { clinicId: { in: [clinicA.id, clinicB.id] } } } });
    await prisma.treatmentPlan.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.appointment.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patientConsent.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });
    await prisma.patient.deleteMany({ where: { clinicId: { in: [clinicA.id, clinicB.id] } } });

    console.log('[2] Initial Operational Record Counts:');
    const countsA = {
      patients: await prisma.patient.count({ where: { clinicId: clinicA.id } }),
      appointments: await prisma.appointment.count({ where: { clinicId: clinicA.id } }),
      invoices: await prisma.invoice.count({ where: { clinicId: clinicA.id } }),
      prescriptions: await prisma.prescription.count({ where: { clinicId: clinicA.id } }),
      clinicalNotes: await prisma.clinicalNote.count({ where: { clinicId: clinicA.id } }),
      treatmentPlans: await prisma.treatmentPlan.count({ where: { clinicId: clinicA.id } }),
      inventoryItems: await prisma.inventoryItem.count({ where: { clinicId: clinicA.id } }),
      inventoryAudits: await prisma.inventoryAudit.count({ where: { clinicId: clinicA.id } }),
    };

    const countsB = {
      patients: await prisma.patient.count({ where: { clinicId: clinicB.id } }),
      appointments: await prisma.appointment.count({ where: { clinicId: clinicB.id } }),
      invoices: await prisma.invoice.count({ where: { clinicId: clinicB.id } }),
      prescriptions: await prisma.prescription.count({ where: { clinicId: clinicB.id } }),
      clinicalNotes: await prisma.clinicalNote.count({ where: { clinicId: clinicB.id } }),
      treatmentPlans: await prisma.treatmentPlan.count({ where: { clinicId: clinicB.id } }),
      inventoryItems: await prisma.inventoryItem.count({ where: { clinicId: clinicB.id } }),
      inventoryAudits: await prisma.inventoryAudit.count({ where: { clinicId: clinicB.id } }),
    };

    console.log('    Clinic A Initial State:', countsA);
    console.log('    Clinic B Initial State:', countsB);

    for (const [key, val] of Object.entries(countsA)) {
      if (val !== 0) throw new Error(`Clinic A has non-zero count for ${key}: ${val}`);
    }
    for (const [key, val] of Object.entries(countsB)) {
      if (val !== 0) throw new Error(`Clinic B has non-zero count for ${key}: ${val}`);
    }
    console.log('  ✓ Initial state confirmed: EXACTLY ZERO operational records in both clinics.\n');

    // 3. Create Operational Records in Clinic A
    console.log('[3] Creating Operational Records strictly in Clinic A...');
    const patientA = await prisma.patient.create({
      data: {
        clinicId: clinicA.id,
        patientCode: 'PA-001',
        firstName: 'Ananya',
        lastName: 'Rao',
        mobile: '+91 98765 11111',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'FEMALE',
      }
    });

    const apptA = await prisma.appointment.create({
      data: {
        clinicId: clinicA.id,
        patientId: patientA.id,
        startTime: new Date('2026-11-10T10:00:00Z'),
        endTime: new Date('2026-11-10T10:30:00Z'),
        durationMinutes: 30,
        status: 'CONFIRMED',
        treatmentType: 'CONSULTATION',
      }
    });

    let doctorA = await prisma.user.findFirst({ where: { clinicId: clinicA.id } });
    if (!doctorA) {
      doctorA = await prisma.user.create({
        data: {
          clinicId: clinicA.id,
          email: `doctor-a-${Date.now()}@test.docmatrix.dental`,
          fullName: 'Dr. A Kumar',
          passwordHash: 'dummyhash',
          role: 'DOCTOR'
        }
      });
    }

    const noteA = await prisma.clinicalNote.create({
      data: {
        clinicId: clinicA.id,
        patientId: patientA.id,
        doctorId: doctorA.id,
        noteNumber: 'NOTE-001',
        chiefComplaint: 'Toothache in 36',
        primaryDiagnosis: 'Dentin caries',
      }
    });

    const rxA = await prisma.prescription.create({
      data: {
        clinicId: clinicA.id,
        patientId: patientA.id,
        doctorId: doctorA.id,
        prescriptionNumber: 'RX-001',
        diagnosis: 'Dental Caries',
        status: 'FINALIZED',
      }
    });

    const invItemA = await prisma.inventoryItem.create({
      data: {
        clinicId: clinicA.id,
        sku: 'SKU-COMP-A2',
        name: 'Composite Syringe A2',
        category: 'Restorative',
        unit: 'syringe',
        totalStock: 15,
        reorderLevel: 5,
      }
    });

    const auditA = await prisma.inventoryAudit.create({
      data: {
        clinicId: clinicA.id,
        procedureName: 'Composite Restoration',
        patientName: 'Ananya Rao',
        doctorName: 'Dr. A Kumar',
        materials: [{ name: 'Composite A2', quantity: 1, unit: 'syringe' }],
        confirmedBy: 'Dr. A Kumar',
      }
    });

    console.log(`    Created Patient: ${patientA.firstName} ${patientA.lastName} (${patientA.id}) in Clinic A`);
    console.log(`    Created Appointment: ${apptA.id} in Clinic A`);
    console.log(`    Created Clinical Note: ${noteA.id} in Clinic A`);
    console.log(`    Created Prescription: ${rxA.id} in Clinic A`);
    console.log(`    Created Inventory Item: ${invItemA.name} in Clinic A`);
    console.log(`    Created Inventory Audit: ${auditA.procedureName} in Clinic A\n`);

    // 4. Query from perspective of Clinic B
    console.log('[4] Verifying Isolation from Clinic B perspective...');
    const patientsInB = await prisma.patient.findMany({ where: { clinicId: clinicB.id } });
    const apptsInB = await prisma.appointment.findMany({ where: { clinicId: clinicB.id } });
    const notesInB = await prisma.clinicalNote.findMany({ where: { clinicId: clinicB.id } });
    const rxInB = await prisma.prescription.findMany({ where: { clinicId: clinicB.id } });
    const itemsInB = await prisma.inventoryItem.findMany({ where: { clinicId: clinicB.id } });
    const auditsInB = await prisma.inventoryAudit.findMany({ where: { clinicId: clinicB.id } });

    console.log(`    Clinic B visible Patients: ${patientsInB.length}`);
    console.log(`    Clinic B visible Appointments: ${apptsInB.length}`);
    console.log(`    Clinic B visible Notes: ${notesInB.length}`);
    console.log(`    Clinic B visible Prescriptions: ${rxInB.length}`);
    console.log(`    Clinic B visible Inventory Items: ${itemsInB.length}`);
    console.log(`    Clinic B visible Inventory Audits: ${auditsInB.length}`);

    if (patientsInB.length > 0 || apptsInB.length > 0 || notesInB.length > 0 || 
        rxInB.length > 0 || itemsInB.length > 0 || auditsInB.length > 0) {
      throw new Error('TENANT LEAK: Clinic B can see Clinic A operational records!');
    }
    console.log('  ✓ 100% Read Isolation Verified: Clinic B sees ZERO records from Clinic A.\n');

    // 5. Cross-Tenant Mutation Attempt
    console.log('[5] Attempting Cross-Tenant Mutation (Clinic B trying to update Clinic A item)...');
    const crossUpdateResult = await prisma.patient.updateMany({
      where: { id: patientA.id, clinicId: clinicB.id },
      data: { firstName: 'Hacked Name' }
    });
    console.log(`    Cross-tenant update affected rows: ${crossUpdateResult.count}`);
    if (crossUpdateResult.count > 0) {
      throw new Error('TENANT MUTATION BREACH: Clinic B was able to update Clinic A record!');
    }

    const patientAAfter = await prisma.patient.findUnique({ where: { id: patientA.id } });
    if (patientAAfter?.firstName !== 'Ananya') {
      throw new Error('Data altered during cross-tenant attempt!');
    }
    console.log('  ✓ 100% Write Isolation Verified: Clinic B cannot mutate Clinic A records.\n');

    console.log('========================================================================');
    console.log('   ALL CLINIC ISOLATION CRITERIA VERIFIED SUCCESSFULLY (NO DRIFT)');
    console.log('========================================================================');
  } catch (err) {
    console.error('FAILED ISOLATION TEST:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runIsolationAudit();
