import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './src/app.module.js';
import { PrismaClient, StaffRole } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'docmatrix-dev-jwt-secret-replace-in-production';
const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runRealHttpApiTests() {
  console.log('========================================================================');
  console.log('   DOCMATRIX — PHASE 3: REAL BACKEND HTTP API & SECURITY AUDIT');
  console.log('========================================================================\n');

  console.log('[1] Booting real NestJS Application with full HTTP pipeline...');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(TEST_PORT);
  console.log(`✓ Real NestJS server listening on ${BASE_URL}`);

  let createdPlanId = '';
  let createdItemId = '';
  let testClinic1Id = '';
  let testClinic2Id = '';
  let patientCode = '';

  try {
    // Resolve Clinic 1 and Clinic 2 with retry for Neon cold start
    let clinic1: any = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        clinic1 = await prisma.clinic.findFirst();
        break;
      } catch (err: any) {
        if (attempt === 4) throw err;
        console.log(`[Neon DB Reconnect] Attempt ${attempt} failed, waiting 2s for compute wake-up...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    if (!clinic1) {
      clinic1 = await prisma.clinic.create({
        data: {
          name: 'DocMatrix Live Test Clinic',
          slug: 'live-test-clinic-' + Date.now(),
          email: 'live@docmatrix.in',
          phone: '+919876543200',
          status: 'ACTIVE',
        },
      });
    }
    testClinic1Id = clinic1.id;

    let clinic2 = await prisma.clinic.findFirst({
      where: { id: { not: testClinic1Id } },
    });
    if (!clinic2) {
      clinic2 = await prisma.clinic.create({
        data: {
          name: 'Clinic B Security Test',
          slug: 'clinic-b-sec-' + Date.now(),
          email: 'sec-b@docmatrix.in',
          phone: '+919876543299',
          status: 'ACTIVE',
        },
      });
    }
    testClinic2Id = clinic2.id;

    // Resolve patient in Clinic 1
    let patient = await prisma.patient.findFirst({ where: { clinicId: testClinic1Id } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          clinicId: testClinic1Id,
          patientCode: 'pt-http-qa-1',
          firstName: 'Rohan',
          lastName: 'Kapoor',
          gender: 'MALE',
          dateOfBirth: new Date('1990-01-01'),
          mobile: '+919876500001',
          isActive: true,
        },
      });
    }
    patientCode = patient.patientCode;

    // Resolve or find doctor in Clinic 1
    let doctorUser = await prisma.user.findFirst({
      where: { clinicId: testClinic1Id, role: { in: ['DOCTOR', 'ORGANIZATION_ADMIN', 'BRANCH_ADMIN'] } },
    });
    if (!doctorUser) {
      doctorUser = await prisma.user.create({
        data: {
          clinicId: testClinic1Id,
          email: `doc.http.${Date.now()}@docmatrix.in`,
          passwordHash: 'dummy',
          fullName: 'Dr. Vikram Malhotra',
          role: 'DOCTOR',
          status: 'ACTIVE',
        },
      });
    }

    // Find or create test doctor in Clinic 2
    let clinic2Doctor = await prisma.user.findFirst({
      where: { clinicId: testClinic2Id },
    });
    if (!clinic2Doctor) {
      clinic2Doctor = await prisma.user.create({
        data: {
          clinicId: testClinic2Id,
          email: `doc2.${Date.now()}@clinicb.in`,
          passwordHash: 'dummy',
          fullName: 'Dr. Clinic B Doctor',
          role: 'DOCTOR',
          isActive: true,
        },
      });
    }

    // Find or create test receptionist in Clinic 1
    let recUser = await prisma.user.findFirst({
      where: { clinicId: testClinic1Id, role: 'RECEPTIONIST' },
    });
    if (!recUser) {
      recUser = await prisma.user.create({
        data: {
          clinicId: testClinic1Id,
          email: `rec.${Date.now()}@clinic1.in`,
          passwordHash: 'dummy',
          fullName: 'Reception Staff',
          role: 'RECEPTIONIST',
          isActive: true,
        },
      });
    }

    // Generate real signed JWT tokens
    const doctorToken = jwt.sign(
      {
        sub: doctorUser.id,
        email: doctorUser.email,
        role: doctorUser.role,
        clinicId: testClinic1Id,
        fullName: doctorUser.fullName,
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const clinic2DoctorToken = jwt.sign(
      {
        sub: clinic2Doctor.id,
        email: clinic2Doctor.email,
        role: clinic2Doctor.role,
        clinicId: testClinic2Id,
        fullName: clinic2Doctor.fullName,
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const receptionistToken = jwt.sign(
      {
        sub: recUser.id,
        email: recUser.email,
        role: recUser.role,
        clinicId: testClinic1Id,
        fullName: recUser.fullName,
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    console.log('✓ Signed real JWT tokens for Doctor (Clinic 1), Doctor (Clinic 2), and Receptionist.\n');

    // -------------------------------------------------------------------------
    // TEST 1: Unauthenticated request rejection (HTTP 401)
    // -------------------------------------------------------------------------
    console.log('[TEST 1] HTTP 401 Unauthorized for Unauthenticated Request...');
    const unauthRes = await fetch(`${BASE_URL}/treatment-plans`);
    console.log(`  HTTP Status: ${unauthRes.status}`);
    const unauthBody = await unauthRes.text();
    console.log(`  Response body: ${unauthBody}`);
    if (unauthRes.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${unauthRes.status} -> ${unauthBody}`);
    console.log('  ✓ Unauthenticated access correctly rejected with 401 Unauthorized.');

    // -------------------------------------------------------------------------
    // TEST 2: Role Authorization: RECEPTIONIST blocked from authoring plans (HTTP 403)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] HTTP 403 Forbidden for Non-Practitioner Role...');
    const forbiddenRes = await fetch(`${BASE_URL}/treatment-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${receptionistToken}`,
      },
      body: JSON.stringify({
        patientId: patientCode,
        title: 'Unauthorized Plan Attempt',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1',
            items: [{ procedureName: 'Scaling', category: 'General', unitFee: 1000 }],
          },
        ],
      }),
    });
    console.log(`  HTTP Status: ${forbiddenRes.status}`);
    const forbiddenJson = await forbiddenRes.json();
    console.log(`  Message: "${forbiddenJson.message}"`);
    if (forbiddenRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${forbiddenRes.status}`);
    console.log('  ✓ Non-practitioner role blocked with 403 Forbidden.');

    // -------------------------------------------------------------------------
    // TEST 3: ValidationPipe: Invalid FDI tooth number & Negative values (HTTP 400)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] HTTP 400 Bad Request for Invalid FDI Tooth Number...');
    const badToothRes = await fetch(`${BASE_URL}/treatment-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: patientCode,
        title: 'Invalid Tooth Plan',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1',
            items: [
              {
                procedureName: 'Extraction',
                category: 'Surgery',
                toothNumber: '99', // Invalid
                unitFee: 1500,
              },
            ],
          },
        ],
      }),
    });
    console.log(`  HTTP Status: ${badToothRes.status}`);
    const badToothJson = await badToothRes.json();
    console.log(`  Message: "${badToothJson.message}"`);
    if (badToothRes.status !== 400) throw new Error(`Expected 400 Bad Request, got ${badToothRes.status}`);
    console.log('  ✓ Invalid FDI tooth number rejected with 400 Bad Request.');

    // -------------------------------------------------------------------------
    // TEST 4: Real HTTP POST /treatment-plans (HTTP 201 Created)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Real HTTP POST /treatment-plans (Valid Multi-stage Plan)...');
    const createRes = await fetch(`${BASE_URL}/treatment-plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        patientId: patientCode,
        doctorId: doctorUser.id,
        title: 'Full Arch Prosthetic Restoration',
        taxRate: 5,
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1: Endodontic Phase',
            targetDate: '2026-12-01',
            items: [
              {
                procedureCode: 'D3330',
                procedureName: 'Molar Root Canal Therapy',
                category: 'Endodontics',
                toothNumber: '16',
                surface: 'MOD',
                quantity: 1,
                unitFee: 6500,
                discount: 500,
              },
              {
                procedureCode: 'D4341',
                procedureName: 'Full Mouth Scaling',
                category: 'Periodontics',
                toothNumber: undefined,
                quantity: 1,
                unitFee: 2000,
                discount: 0,
              },
            ],
          },
          {
            stageNumber: 2,
            name: 'Stage 2: Prosthetic Phase',
            targetDate: '2026-12-20',
            items: [
              {
                procedureCode: 'D2740',
                procedureName: 'Ceramic Crown',
                category: 'Prosthodontics',
                toothNumber: '16',
                surface: 'B',
                quantity: 1,
                unitFee: 9000,
                discount: 1000,
              },
            ],
          },
        ],
      }),
    });

    console.log(`  HTTP Status: ${createRes.status}`);
    if (createRes.status !== 201) {
      const errText = await createRes.text();
      throw new Error(`Failed to create plan via HTTP: ${createRes.status} ${errText}`);
    }
    const createdPlan = await createRes.json();
    createdPlanId = createdPlan.id;
    createdItemId = createdPlan.stages[0].items[0].id;

    console.log(`  ✓ Plan Created via HTTP API: ${createdPlan.planNumber} (ID: ${createdPlan.id})`);
    console.log(`  • Status: ${createdPlan.status}, Version: v${createdPlan.currentVersion}`);
    console.log(`  • Subtotal: ₹${createdPlan.subtotal}, Tax: ₹${createdPlan.tax}, Total: ₹${createdPlan.totalEstimatedCost}`);

    if (Number(createdPlan.totalEstimatedCost) !== 16800) {
      throw new Error(`Expected total ₹16800.00, got ${createdPlan.totalEstimatedCost}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Real HTTP GET /treatment-plans & GET /treatment-plans/:id
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Real HTTP GET /treatment-plans and GET /treatment-plans/:id...');
    const listRes = await fetch(`${BASE_URL}/treatment-plans?search=${createdPlan.planNumber}`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    console.log(`  GET /treatment-plans HTTP Status: ${listRes.status}`);
    const listJson = await listRes.json();
    console.log(`  • Found ${listJson.items?.length} matching plan(s) in list.`);

    const getRes = await fetch(`${BASE_URL}/treatment-plans/${createdPlanId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    console.log(`  GET /treatment-plans/:id HTTP Status: ${getRes.status}`);
    const singlePlan = await getRes.json();
    console.log(`  ✓ Retrieved plan #${singlePlan.planNumber} with ${singlePlan.stages.length} stages.`);

    // -------------------------------------------------------------------------
    // TEST 6: Real HTTP POST /treatment-plans/:id/accept
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Real HTTP POST /treatment-plans/:id/accept...');
    const acceptRes = await fetch(`${BASE_URL}/treatment-plans/${createdPlanId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        versionNumber: 1,
        patientAcceptedByName: 'Rohan Kapoor',
        acceptanceMethod: 'STAFF_RECORDED',
        isStaffRecorded: true,
        notes: 'Patient verbally accepted after chairside consultation',
      }),
    });
    console.log(`  HTTP Status: ${acceptRes.status}`);
    const acceptedJson = await acceptRes.json();
    console.log(`  • Status after acceptance: ${acceptedJson.status}`);
    console.log(`  • Staff recorded flag: ${acceptedJson.isStaffRecorded}`);
    if (acceptedJson.status !== 'ACCEPTED') throw new Error('Plan did not transition to ACCEPTED!');

    // -------------------------------------------------------------------------
    // TEST 7: Multi-Tenant Cross-Clinic Isolation (HTTP 404)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] HTTP 404 Multi-Tenant Cross-Clinic Access Attempt...');
    const crossClinicRes = await fetch(`${BASE_URL}/treatment-plans/${createdPlanId}`, {
      headers: { Authorization: `Bearer ${clinic2DoctorToken}` },
    });
    console.log(`  HTTP Status: ${crossClinicRes.status}`);
    const crossClinicJson = await crossClinicRes.json();
    console.log(`  Message: "${crossClinicJson.message}"`);
    if (crossClinicRes.status !== 404) throw new Error(`Expected 404 Not Found, got ${crossClinicRes.status}`);
    console.log('  ✓ Cross-clinic access strictly isolated and rejected with 404 Not Found.');

    // -------------------------------------------------------------------------
    // TEST 8: Real HTTP PATCH /treatment-plans/:id (Estimate Revision v1 -> v2)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Real HTTP PATCH /treatment-plans/:id (Estimate Revision v2)...');
    const updateRes = await fetch(`${BASE_URL}/treatment-plans/${createdPlanId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        revisionReason: 'Added post and core build-up procedure',
        taxRate: 5,
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1: Modified Endodontic Phase',
            items: [
              {
                procedureName: 'Molar Root Canal Therapy',
                category: 'Endodontics',
                toothNumber: '16',
                unitFee: 6500,
                discount: 0,
              },
              {
                procedureName: 'Prefabricated Post & Core',
                category: 'Restorative',
                toothNumber: '16',
                unitFee: 3500,
                discount: 500,
              },
            ],
          },
        ],
      }),
    });
    console.log(`  HTTP Status: ${updateRes.status}`);
    const revisedPlan = await updateRes.json();
    console.log(`  • Version: v${revisedPlan.currentVersion}`);
    console.log(`  • Status after revision: ${revisedPlan.status} (Reset to PROPOSED for renewed acceptance)`);
    if (revisedPlan.currentVersion !== 2 || revisedPlan.status !== 'PROPOSED') {
      throw new Error('Revision did not increment version to 2 or reset status to PROPOSED!');
    }
    console.log('  ✓ Revision v2 created authoritatively over HTTP API.');

    // -------------------------------------------------------------------------
    // TEST 9: Real HTTP PATCH procedure item status
    // -------------------------------------------------------------------------
    console.log('\n[TEST 9] Real HTTP PATCH item status (Lifecycle progression)...');
    const newStageItem = revisedPlan.stages[0].items[0];
    const itemPatchRes = await fetch(
      `${BASE_URL}/treatment-plans/${createdPlanId}/items/${newStageItem.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          notes: 'Completed successfully under rubber dam isolation',
        }),
      },
    );
    console.log(`  HTTP Status: ${itemPatchRes.status}`);
    const progressPlan = await itemPatchRes.json();
    console.log(`  • Item status: ${progressPlan.stages[0].items[0].status}`);
    console.log(`  • Stage status: ${progressPlan.stages[0].status}`);

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Removing test HTTP plan from Neon PostgreSQL...');
    await prisma.treatmentPlan.delete({ where: { id: createdPlanId } });
    console.log('  ✓ Test HTTP plan safely cleaned up.');

    console.log('\n========================================================================');
    console.log('   ALL REAL BACKEND HTTP API & SECURITY TESTS PASSED! (100%)');
    console.log('========================================================================\n');
  } finally {
    await app.close();
    await prisma.$disconnect();
    console.log('✓ NestJS test server shut down.');
  }
}

runRealHttpApiTests().catch((err) => {
  console.error('\n❌ REAL HTTP API TEST FAILED:', err);
  process.exit(1);
});

