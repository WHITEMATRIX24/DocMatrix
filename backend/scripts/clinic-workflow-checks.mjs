// Real HTTP/database workflow checks, called only by the isolated browser harness.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
export async function checkClinicWorkflows(db) {
  const url = new URL(process.env.BATCH1_DATABASE_URL || '');
  if (url.hostname !== '127.0.0.1' || url.port !== '55440' || url.searchParams.get('schema') !== 'batch1_security') throw new Error('Synthetic database required.');
  const base = 'http://127.0.0.1:3008';
  async function api(method, path, token, data, expected = method === 'POST' ? 201 : 200) {
    const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(15000) });
    const body = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(body.message || body.error || 'Unexpected response status')}`);
    return body;
  }
  const password = randomBytes(18).toString('hex');
  const email = `${randomUUID()}@example.test`;
  const registered = await api('POST', '/auth/register-clinic', null, { fullName: 'Synthetic Owner', clinicName: 'Synthetic Workflow Clinic', email, password, mobile: '000' });
  const login = await api('POST', '/auth/login', null, { email, password }, 200);
  const owner = login.token;
  const clinicId = login.user.clinicId;
  await api('PATCH', '/clinics/my-clinic', owner, { address: 'Synthetic address', workingHours: { weekdays: '09:00 AM - 08:00 PM', saturday: '09:00 AM - 06:00 PM', sunday: 'Closed' } });
  assert.equal((await db.clinic.findUniqueOrThrow({ where: { id: clinicId } })).address, 'Synthetic address');

  const doctorEmail = `${randomUUID()}@example.test`;
  const doctor = await api('POST', '/clinics/my-clinic/staff', owner, { fullName: 'Synthetic Workflow Doctor', email: doctorEmail, password, role: 'DOCTOR' });
  const staffLogin = await api('POST', '/auth/login', null, { email: doctorEmail, password }, 200);
  const practitioner = staffLogin.token;
  assert.equal(staffLogin.user.role, 'DOCTOR');
  const patient = await api('POST', '/patients', owner, { firstName: 'Synthetic', lastName: 'Workflow Patient', dateOfBirth: '2000-01-01', mobile: '000' });
  assert.equal((await api('GET', `/patients/${patient.id}`, owner)).id, patient.id);

  const appointment = await api('POST', '/appointments', owner, { patientId: patient.id, doctorId: doctor.id, date: '2030-01-07', time: '10:00', durationMinutes: 30, chair: 'Synthetic chair' });
  await api('PATCH', `/appointments/${appointment.id}`, owner, { status: 'checked-in' });
  await api('PATCH', `/appointments/${appointment.id}`, practitioner, { status: 'in-progress' });
  const note = await api('POST', '/clinical-notes', practitioner, { patientId: patient.id, appointmentId: appointment.id, chiefComplaint: 'Synthetic verification', primaryDiagnosis: 'Synthetic diagnosis', doctorId: doctor.id });
  await api('POST', `/clinical-notes/${note.id}/finalize`, practitioner, {});
  await api('PUT', `/patients/${patient.id}/tooth-chart`, practitioner, { toothNumber: 46, condition: 'Caries', notes: 'Synthetic observation' });
  assert.equal((await api('GET', `/patients/${patient.id}/tooth-chart/history`, practitioner)).length, 1);

  const prescription = await api('POST', '/prescriptions', practitioner, { patientId: patient.id, diagnosis: 'Synthetic diagnosis', items: [{ medicineName: 'Synthetic test item', dosage: 'test only', frequency: 'test only', duration: 'test only' }] });
  await api('POST', `/prescriptions/${prescription.id}/finalize`, practitioner, {});
  const plan = await api('POST', '/treatment-plans', practitioner, { patientId: patient.id, appointmentId: appointment.id, title: 'Synthetic treatment', stages: [{ stageNumber: 1, name: 'Synthetic stage', items: [{ procedureName: 'Synthetic procedure', category: 'General', quantity: 1, unitFee: 100 }] }] });
  await api('POST', `/treatment-plans/${plan.id}/accept`, practitioner, { versionNumber: 1, patientAcceptedByName: 'Synthetic Patient', acceptanceMethod: 'STAFF_RECORDED', isStaffRecorded: true, notes: 'Synthetic evidence recorded by staff' });
  const invoice = await api('POST', '/billing/invoices/from-treatment-plan', owner, { treatmentPlanId: plan.id, appointmentId: appointment.id, issueImmediately: true });
  await api('POST', `/billing/invoices/${invoice.id}/payments`, owner, { amount: 40, mode: 'CASH', idempotencyKey: randomUUID() });
  const storedInvoice = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
  assert.equal(Number(storedInvoice.balance), 60);
  await api('GET', '/billing/dues', owner);

  await api('PATCH', `/treatment-plans/${plan.id}/items/${plan.stages[0].items[0].id}`, practitioner, { status: 'COMPLETED' });
  const item = await api('POST', '/inventory/items', owner, { sku: randomUUID(), name: 'Synthetic material', category: 'General', unit: 'piece', initialBatch: { batchNumber: 'SYNTHETIC-LOT', expiryDate: '2031-01-01', quantity: 10 } });
  const operationId = randomUUID();
  const deduction = { operationId, procedureName: 'Synthetic procedure', patientId: patient.id, patientName: 'Synthetic Patient', doctorId: doctor.id, doctorName: doctor.fullName, treatmentId: plan.id, appointmentId: appointment.id, materials: [{ itemId: item.id, confirmedQty: 2, wastageQty: 0, batchNumber: 'SYNTHETIC-LOT' }] };
  await api('POST', '/inventory/deduct', practitioner, deduction);
  await api('POST', '/inventory/deduct', practitioner, deduction);
  assert.equal((await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).totalStock, 8);
  await api('PATCH', `/appointments/${appointment.id}`, practitioner, { status: 'completed' });
  for (const path of ['summary','revenue','doctors','treatments','follow-ups']) await api('GET', `/reports/${path}`, owner);
  assert.equal((await db.clinicalNote.findUniqueOrThrow({ where: { id: note.id } })).status, 'FINALIZED');
  assert.equal((await db.prescription.findUniqueOrThrow({ where: { id: prescription.id } })).status, 'FINALIZED');
  return { passed: true, mode: 'real HTTP and isolated PostgreSQL; not all UI clicks', workflows: ['register/login/configure','create staff/assign role/staff login','register patient/profile','book/check-in/consultation','clinical note/tooth chart/history','prescription save/finalize','treatment estimate/acceptance/invoice','payment/outstanding dues','treatment completion/idempotent stock deduction','daily reports'] };
}
