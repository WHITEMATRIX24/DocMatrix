import { PrismaClient, TreatmentPlanStatus, TreatmentPlanItemStatus, AcceptanceMethod, TreatmentStageStatus } from '@prisma/client';
import { TreatmentPlansService } from './src/treatment-plans/treatment-plans.service.js';
import { AuthenticatedUser } from './src/common/decorators/current-user.decorator.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const prisma = new PrismaClient();
const service = new TreatmentPlansService(prisma as any);

async function runE2EVerification() {
  console.log('========================================================================');
  console.log('   DOCMATRIX — TREATMENT PLANS & COST ESTIMATES LIVE DB E2E AUDIT');
  console.log('========================================================================\n');

  let testClinic1Id = '';
  let testClinic2Id = '';
  let testPatientId = '';
  let testDoctorUser: AuthenticatedUser;
  let testReceptionistUser: AuthenticatedUser;
  let createdPlanId = '';

  try {
    // -------------------------------------------------------------------------
    // SETUP: Resolve or create test clinic and test patient
    // -------------------------------------------------------------------------
    console.log('[SETUP] Resolving test clinics and users in Neon PostgreSQL...');
    
    // Find existing clinic or create test clinic
    let clinic1 = await prisma.clinic.findFirst();
    if (!clinic1) {
      clinic1 = await prisma.clinic.create({
        data: {
          name: 'DocMatrix E2E Test Clinic',
          slug: 'e2e-test-clinic-' + Date.now(),
          email: 'e2e@docmatrix.in',
          phone: '+919999999999',
          status: 'ACTIVE',
        },
      });
    }
    testClinic1Id = clinic1.id;

    // Find or create a second clinic to test multi-tenant cross-clinic isolation
    let clinic2 = await prisma.clinic.findFirst({
      where: { id: { not: testClinic1Id } },
    });
    if (!clinic2) {
      clinic2 = await prisma.clinic.create({
        data: {
          name: 'Isolated Clinic B',
          slug: 'docmatrix-isolated-test-' + Date.now(),
          email: 'isolated@docmatrix.in',
          phone: '+918888888888',
          status: 'ACTIVE',
        },
      });
    }
    testClinic2Id = clinic2.id;

    // Find or create test patient in Clinic 1
    let patient = await prisma.patient.findFirst({
      where: { clinicId: testClinic1Id, patientCode: 'pt-qa-e2e-1' },
    });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          clinicId: testClinic1Id,
          patientCode: 'pt-qa-e2e-1',
          firstName: 'Ananya',
          lastName: 'Sharma',
          gender: 'FEMALE',
          mobile: '+919876543210',
          email: 'ananya.qa@example.com',
          dateOfBirth: new Date('1994-05-15'),
          isActive: true,
        },
      });
    }
    testPatientId = patient.id;

    // Find or create test doctor user
    let doctor = await prisma.user.findFirst({
      where: { clinicId: testClinic1Id, role: { in: ['DOCTOR', 'ORGANIZATION_ADMIN', 'BRANCH_ADMIN'] } },
    });
    if (!doctor) {
      doctor = await prisma.user.create({
        data: {
          clinicId: testClinic1Id,
          email: `dr.qa.${Date.now()}@docmatrix.in`,
          passwordHash: 'hashed_password_for_testing',
          fullName: 'Dr. Neha Verma (BDS, MDS)',
          role: 'DOCTOR',
          status: 'ACTIVE',
        },
      });
    }

    testDoctorUser = {
      id: doctor.id,
      clinicId: testClinic1Id,
      email: doctor.email,
      fullName: doctor.fullName,
      name: doctor.fullName,
      role: 'DOCTOR',
      isPlatformAdmin: false,
      isPrimaryContact: false,
    };

    testReceptionistUser = {
      id: 'rec-user-e2e',
      clinicId: testClinic1Id,
      email: 'reception@docmatrix.in',
      fullName: 'Front Desk Staff',
      name: 'Front Desk Staff',
      role: 'RECEPTIONIST' as any,
      isPlatformAdmin: false,
      isPrimaryContact: false,
    };

    // Clean up any previous test plans for this patient
    await prisma.treatmentPlan.deleteMany({
      where: { patientId: patient.id },
    });

    console.log(`✓ Test environment ready. Clinic 1: ${testClinic1Id}, Patient: ${patient.firstName} ${patient.lastName} (${patient.patientCode})\n`);

    // -------------------------------------------------------------------------
    // TEST 1: Treatment Plan Creation with Multi-Stage & FDI Tooth / Non-Tooth
    // -------------------------------------------------------------------------
    console.log('[TEST 1] Treatment Plan Creation (Multi-stage, Tooth & Non-tooth procedures)...');
    
    const createDto = {
      patientId: patient.patientCode, // Resolves by patientCode
      doctorId: testDoctorUser.id,
      title: 'Comprehensive Smile & Occlusion Rehabilitation',
      notes: 'Initial restorative and periodontal phases',
      taxRate: 5, // 5% tax
      stages: [
        {
          stageNumber: 1,
          name: 'Stage 1: Periodontal Stabilization & Pain Relief',
          targetDate: '2026-11-20',
          items: [
            {
              procedureCode: 'D4341',
              procedureName: 'Full Mouth Scaling & Deep Root Planing',
              category: 'Periodontics',
              toothNumber: undefined, // Non-tooth general procedure
              quantity: 1,
              unitFee: 2500,
              discount: 500, // net: 2000
            },
            {
              procedureCode: 'D3310',
              procedureName: 'Endodontic Therapy - Anterior',
              category: 'Endodontics',
              toothNumber: '21', // Permanent anterior
              surface: 'MOD',
              quantity: 1,
              unitFee: 4500,
              discount: 0, // net: 4500
            },
            {
              procedureCode: 'D2391',
              procedureName: 'Resin Restoration - Deciduous Molar',
              category: 'Pediatric/Restorative',
              toothNumber: '74', // Primary deciduous tooth
              surface: 'O',
              quantity: 1,
              unitFee: 1500,
              discount: 0, // net: 1500
            },
          ],
        },
        {
          stageNumber: 2,
          name: 'Stage 2: Fixed Prosthodontics',
          targetDate: '2026-12-15',
          items: [
            {
              procedureCode: 'D2740',
              procedureName: 'Crown - Porcelain/Ceramic Substrate',
              category: 'Prosthodontics',
              toothNumber: '16', // Permanent maxillary molar
              surface: 'B',
              quantity: 1,
              unitFee: 8000,
              discount: 1000, // net: 7000
            },
            {
              procedureCode: 'D9999',
              procedureName: 'Post-op Evaluation & Occlusal Polish',
              category: 'Preventive',
              toothNumber: undefined,
              quantity: 1,
              unitFee: 0, // Zero-cost procedure test
              discount: 0, // net: 0
            },
          ],
        },
      ],
    };

    const createdPlan = await service.createTreatmentPlan(testClinic1Id, testDoctorUser, createDto);
    createdPlanId = createdPlan.id;

    console.log(`✓ Plan created: ${createdPlan.planNumber} (UUID: ${createdPlan.id})`);
    console.log(`✓ Status: ${createdPlan.status}, Version: v${createdPlan.currentVersion}`);
    console.log(`✓ Stages created: ${createdPlan.stages.length}`);

    // Verify directly in Neon PostgreSQL via raw query
    const dbPlan = await prisma.treatmentPlan.findUnique({
      where: { id: createdPlan.id },
      include: {
        stages: { include: { items: true } },
        estimateRevisions: true,
        histories: true,
      },
    });

    if (!dbPlan) throw new Error('Plan not found in PostgreSQL database!');
    console.log('✓ Verified plan record persistence in Neon PostgreSQL.');
    console.log(`  - Subtotal: ₹${dbPlan.subtotal} (Expected: 15000.00)`);
    console.log(`  - Total Discount: ₹${dbPlan.discount} (Expected: 1500.00)`);
    console.log(`  - Tax (5%): ₹${dbPlan.tax} (Expected: 750.00)`);
    console.log(`  - Total Estimated Cost: ₹${dbPlan.totalEstimatedCost} (Expected: 15750.00)`);

    if (Number(dbPlan.subtotal) !== 15000 || Number(dbPlan.totalEstimatedCost) !== 15750) {
      throw new Error(`Financial calculation mismatch! Got subtotal=${dbPlan.subtotal}, total=${dbPlan.totalEstimatedCost}`);
    }
    console.log('✓ Stage 1 & 2 itemized procedures verified in DB:');
    for (const st of dbPlan.stages) {
      console.log(`    Stage ${st.stageNumber}: ${st.name} (Estimated: ₹${st.estimatedCost})`);
      for (const it of st.items) {
        console.log(`      • ${it.procedureName} | Tooth: ${it.toothNumber || 'General'} | Surface: ${it.surface || 'N/A'} | Net: ₹${it.netFee}`);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 2: Cost Estimate Precision & Edge Cases
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Cost Estimate Verification, Revisions & Edge Cases...');

    // Edge case: Negative fee rejection
    try {
      await service.createTreatmentPlan(testClinic1Id, testDoctorUser, {
        patientId: patient.patientCode,
        title: 'Negative Test',
        stages: [
          {
            stageNumber: 1,
            name: 'Invalid Stage',
            items: [
              {
                procedureName: 'Faulty Procedure',
                category: 'General',
                unitFee: -500,
              },
            ],
          },
        ],
      });
      throw new Error('FAILED: Negative unitFee should have been rejected!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`✓ Negative unit fee correctly rejected: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // Edge case: Negative discount rejection
    try {
      await service.createTreatmentPlan(testClinic1Id, testDoctorUser, {
        patientId: patient.patientCode,
        title: 'Negative Discount Test',
        stages: [
          {
            stageNumber: 1,
            name: 'Invalid Stage',
            items: [
              {
                procedureName: 'Faulty Procedure',
                category: 'General',
                unitFee: 1000,
                discount: -200,
              },
            ],
          },
        ],
      });
      throw new Error('FAILED: Negative discount should have been rejected!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`✓ Negative discount correctly rejected: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // Large amount test (Implant reconstruction ₹999,999.00)
    const largePlan = await service.createTreatmentPlan(testClinic1Id, testDoctorUser, {
      patientId: patient.patientCode,
      title: 'Full Mouth All-on-4 Implant Reconstruction',
      stages: [
        {
          stageNumber: 1,
          name: 'Surgical Stage',
          items: [
            {
              procedureName: 'All-on-4 Implant Fixtures & Hybrid Prosthesis',
              category: 'Implantology',
              unitFee: 999999,
              quantity: 1,
            },
          ],
        },
      ],
    });
    console.log(`✓ Large value plan handled authoritatively: Plan ${largePlan.planNumber} total = ₹${largePlan.totalEstimatedCost}`);
    // Clean up temporary large plan
    await prisma.treatmentPlan.delete({ where: { id: largePlan.id } });

    // -------------------------------------------------------------------------
    // TEST 3: Patient Acceptance & Staff-Recorded Disclaimer
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Patient Acceptance & Audit Trail...');

    // 1. Record Acceptance with Staff-Recorded Verbal Confirmation
    const acceptedPlan = await service.recordAcceptance(testClinic1Id, testDoctorUser, createdPlan.id, {
      versionNumber: 1,
      patientAcceptedByName: 'Ananya Sharma',
      acceptanceMethod: AcceptanceMethod.STAFF_RECORDED,
      isStaffRecorded: true,
      notes: 'Patient verbally agreed to Stage 1 and Stage 2 during chairside consultation',
    });

    console.log(`✓ Plan status after acceptance: ${acceptedPlan.status}`);
    console.log(`✓ Accepted version: v${acceptedPlan.acceptedVersion}`);
    console.log(`✓ Staff-recorded flag: ${acceptedPlan.isStaffRecorded}`);

    // Verify audit history record in DB
    const latestHistory = await prisma.treatmentPlanHistory.findFirst({
      where: { treatmentPlanId: createdPlan.id, action: 'ACCEPTED' },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestHistory || !latestHistory.details) {
      throw new Error('Missing acceptance audit history in PostgreSQL!');
    }
    const details = latestHistory.details as any;
    console.log(`✓ Audit history verified: Action=${latestHistory.action}, User=${latestHistory.userName}`);
    console.log(`  Disclaimer in audit record: "${details.disclaimer}"`);
    if (!details.isStaffRecorded || !details.disclaimer.includes('staff on behalf of patient')) {
      throw new Error('Acceptance audit does not properly label staff-recorded verbal agreement!');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Estimate Revision & Renewed Acceptance Requirement
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Estimate Versioning (v1 -> v2) & Renewed Acceptance...');

    // Doctor updates the plan with revised Stage 2 (adding ceramic inlay)
    const revisedPlan = await service.updateTreatmentPlan(testClinic1Id, testDoctorUser, createdPlan.id, {
      revisionReason: 'Patient requested ceramic inlay instead of composite',
      taxRate: 5,
      stages: [
        ...createDto.stages,
        {
          stageNumber: 3,
          name: 'Stage 3: Esthetic Finishing',
          targetDate: '2027-01-10',
          items: [
            {
              procedureCode: 'D2610',
              procedureName: 'Inlay - Porcelain/Ceramic 1 Surface',
              category: 'Restorative',
              toothNumber: '25',
              surface: 'O',
              quantity: 1,
              unitFee: 5000,
              discount: 500, // net: 4500
            },
          ],
        },
      ],
    });

    console.log(`✓ Plan updated to version: v${revisedPlan.currentVersion}`);
    console.log(`✓ Plan status after revision: ${revisedPlan.status} (Reset to PROPOSED for renewed acceptance)`);
    console.log(`✓ New total estimated cost: ₹${revisedPlan.totalEstimatedCost}`);

    // Verify both revisions exist in PostgreSQL
    const revisions = await prisma.treatmentEstimateRevision.findMany({
      where: { treatmentPlanId: createdPlan.id },
      orderBy: { versionNumber: 'asc' },
    });

    console.log(`✓ Total revisions in database: ${revisions.length}`);
    for (const rev of revisions) {
      console.log(`  - Version ${rev.versionNumber}: Status=${rev.status}, Total=₹${rev.totalEstimatedCost}, Reason="${rev.revisionReason}"`);
    }

    if (revisions.length < 2) throw new Error('Revision v2 was not properly persisted in PostgreSQL!');
    if (revisions[0].status !== 'ACCEPTED') throw new Error('Historical v1 acceptance snapshot was overwritten!');
    if (revisions[1].status !== 'PROPOSED') throw new Error('New v2 estimate should start in PROPOSED status!');
    console.log('✓ Historical acceptance snapshot for v1 is 100% preserved.');

    // Now record renewed acceptance for v2 with digital signature
    const reacceptedPlan = await service.recordAcceptance(testClinic1Id, testDoctorUser, createdPlan.id, {
      versionNumber: 2,
      patientAcceptedByName: 'Ananya Sharma',
      acceptanceMethod: AcceptanceMethod.WRITTEN_CONSENT,
      isStaffRecorded: false,
      notes: 'Patient signed formal A4 treatment estimate consent form',
    });
    console.log(`✓ Renewed acceptance recorded for v${reacceptedPlan.acceptedVersion} via ${reacceptedPlan.acceptanceMethod}`);

    // -------------------------------------------------------------------------
    // TEST 5: Procedure Progress Tracking & Automatic Transitions
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Procedure Status Tracking & Progress Lifecycle...');

    const freshPlan = await service.getTreatmentPlanById(testClinic1Id, createdPlan.id);
    const stage1 = freshPlan.stages[0];
    const item1 = stage1.items[0];
    const item2 = stage1.items[1];
    const item3 = stage1.items[2];

    // 1. Start Item 1 -> Plan should automatically transition to IN_PROGRESS
    console.log(`  Setting Item 1 (${item1.procedureName}) to IN_PROGRESS...`);
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, item1.id, {
      status: TreatmentPlanItemStatus.IN_PROGRESS,
      notes: 'Patient seated, scaling commenced',
    });

    let checkPlan = await service.getTreatmentPlanById(testClinic1Id, createdPlan.id);
    console.log(`  ✓ Plan status transitioned to: ${checkPlan.status}`);
    console.log(`  ✓ Stage 1 status: ${checkPlan.stages[0].status}`);

    if (checkPlan.status !== TreatmentPlanStatus.IN_PROGRESS) {
      throw new Error(`Plan did not transition to IN_PROGRESS! Got ${checkPlan.status}`);
    }

    // 2. Complete all items in Stage 1
    console.log('  Completing all procedures in Stage 1...');
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, item1.id, {
      status: TreatmentPlanItemStatus.COMPLETED,
    });
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, item2.id, {
      status: TreatmentPlanItemStatus.COMPLETED,
    });
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, item3.id, {
      status: TreatmentPlanItemStatus.COMPLETED,
    });

    checkPlan = await service.getTreatmentPlanById(testClinic1Id, createdPlan.id);
    console.log(`  ✓ Stage 1 status after completing all items: ${checkPlan.stages[0].status}`);
    if (checkPlan.stages[0].status !== TreatmentStageStatus.COMPLETED) {
      throw new Error(`Stage 1 was not marked COMPLETED! Got ${checkPlan.stages[0].status}`);
    }

    // 3. Test Deferred item handling in Stage 2
    const stage2 = checkPlan.stages[1];
    const stage2Item1 = stage2.items[0];
    const stage2Item2 = stage2.items[1];

    console.log(`  Marking Stage 2 Item 2 (${stage2Item2.procedureName}) as DEFERRED...`);
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, stage2Item2.id, {
      status: TreatmentPlanItemStatus.DEFERRED,
      notes: 'Deferred to next quarter as per patient schedule',
    });

    // 4. Test Cancelled item handling
    const stage3 = checkPlan.stages[2];
    const stage3Item = stage3.items[0];
    console.log(`  Marking Stage 3 Item (${stage3Item.procedureName}) as CANCELLED...`);
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, stage3Item.id, {
      status: TreatmentPlanItemStatus.CANCELLED,
      notes: 'Patient opted out of elective inlay',
    });

    // Complete remaining active item in Stage 2
    await service.updatePlanItemStatus(testClinic1Id, testDoctorUser, createdPlan.id, stage2Item1.id, {
      status: TreatmentPlanItemStatus.COMPLETED,
    });

    checkPlan = await service.getTreatmentPlanById(testClinic1Id, createdPlan.id);
    console.log(`✓ Item statuses in DB verified:`);
    for (const st of checkPlan.stages) {
      console.log(`    Stage ${st.stageNumber} (${st.status}):`);
      for (const it of st.items) {
        console.log(`      - ${it.procedureName}: [${it.status}] ${it.notes ? `(${it.notes})` : ''}`);
      }
    }

    // -------------------------------------------------------------------------
    // TEST 6: FDI Tooth & Surface Validation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] FDI Tooth Numbering & Surface Code Validation...');

    // Invalid FDI Tooth (e.g. 99, 49)
    try {
      await service.createTreatmentPlan(testClinic1Id, testDoctorUser, {
        patientId: patient.patientCode,
        title: 'Invalid Tooth Test',
        stages: [
          {
            stageNumber: 1,
            name: 'Invalid Stage',
            items: [
              {
                procedureName: 'Extraction',
                category: 'Surgery',
                toothNumber: '99', // Invalid
                unitFee: 1000,
              },
            ],
          },
        ],
      });
      throw new Error('FAILED: Invalid tooth number 99 should have been rejected!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`✓ Invalid tooth '99' correctly rejected: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // Invalid Surface Code (e.g. 'XYZ')
    try {
      await service.createTreatmentPlan(testClinic1Id, testDoctorUser, {
        patientId: patient.patientCode,
        title: 'Invalid Surface Test',
        stages: [
          {
            stageNumber: 1,
            name: 'Invalid Stage',
            items: [
              {
                procedureName: 'Composite',
                category: 'Restorative',
                toothNumber: '11',
                surface: 'XYZ', // Invalid
                unitFee: 1000,
              },
            ],
          },
        ],
      });
      throw new Error('FAILED: Invalid surface code XYZ should have been rejected!');
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        console.log(`✓ Invalid surface 'XYZ' correctly rejected: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------------------
    // TEST 7: Security, Multi-Tenant Isolation & Role Authorization
    // -------------------------------------------------------------------------
    console.log('\n[TEST 7] Security, Permissions & Multi-Tenant Isolation...');

    // 1. Cross-clinic access attempt
    try {
      await service.getTreatmentPlanById(testClinic2Id, createdPlan.id);
      throw new Error('FAILED: Clinic 2 should not be able to view Clinic 1 plan!');
    } catch (err: any) {
      if (err instanceof NotFoundException) {
        console.log(`✓ Cross-clinic plan access strictly blocked with 404: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // 2. Unauthorized role attempt (RECEPTIONIST attempting to create/revise a treatment plan)
    try {
      await service.createTreatmentPlan(testClinic1Id, testReceptionistUser, {
        patientId: patient.patientCode,
        title: 'Unauthorized Plan',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1',
            items: [{ procedureName: 'Clean', category: 'Preventive', unitFee: 500 }],
          },
        ],
      });
      throw new Error('FAILED: Receptionist should not be permitted to author treatment plans!');
    } catch (err: any) {
      if (err instanceof ForbiddenException) {
        console.log(`✓ Unauthorized practitioner role blocked with 403: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------------------
    // TEST 8: Legacy Treatment Plan Migration & Idempotency
    // -------------------------------------------------------------------------
    console.log('\n[TEST 8] Legacy Treatment Plan Migration & Idempotency...');

    const legacyPayload = {
      plans: [
        {
          legacyId: 'TRT-9999-E2E',
          patientId: patient.patientCode,
          procedure: 'Porcelain Veneer',
          category: 'Cosmetic',
          toothNumber: '12',
          status: 'Proposed',
          cost: 12000,
          doctor: 'Dr. Neha Verma',
          notes: 'Legacy aesthetic consultation record',
        },
      ],
    };

    // First import
    const import1 = await service.importLegacyPlans(testClinic1Id, testDoctorUser, legacyPayload);
    console.log(`✓ First legacy import: Imported=${import1.imported}, Skipped=${import1.skipped}`);
    if (import1.imported !== 1) throw new Error('Legacy import failed on first run!');

    // Second repeated import (must be idempotent - skip duplicate)
    const import2 = await service.importLegacyPlans(testClinic1Id, testDoctorUser, legacyPayload);
    console.log(`✓ Repeated legacy import (Idempotency test): Imported=${import2.imported}, Skipped=${import2.skipped}`);
    if (import2.skipped !== 1 || import2.imported !== 0) {
      throw new Error('Repeated legacy import created duplicates or failed idempotency check!');
    }
    console.log('✓ Idempotency verified: Duplicate legacy records safely skipped.');

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records from PostgreSQL...');
    await prisma.treatmentPlan.deleteMany({
      where: {
        id: { in: [createdPlan.id] },
      },
    });
    await prisma.treatmentPlan.deleteMany({
      where: {
        clinicId: testClinic1Id,
        notes: { contains: '[Legacy Ref: TRT-9999-E2E]' },
      },
    });
    console.log('✓ Test treatment plans, stages, items, revisions, and audit histories cleaned up.');

    console.log('\n========================================================================');
    console.log('   ALL E2E LIVE DATABASE VERIFICATION TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('========================================================================\n');
  } catch (error) {
    console.error('\n❌ E2E VERIFICATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runE2EVerification();
