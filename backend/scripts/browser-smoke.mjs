import { checkClinicWorkflows } from './clinic-workflow-checks.mjs';
import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
const url = new URL(process.env.BATCH1_DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.port !== '55440' || url.username !== 'batch_security' || url.searchParams.get('schema') !== 'batch1_security') throw new Error('Browser smoke requires the isolated test cluster.');
const db = new PrismaClient({ datasources: { db: { url: url.href } } });
const children = [];
let browser, page, frontend;
const errors = [];
const password = randomBytes(18).toString('hex');
const email = `browser-${randomUUID()}@example.test`;
const env = { ...process.env, PORT: '3008', CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5188', REDIS_URL: '', RATE_LIMIT_STORE: 'memory', THROTTLE_LIMIT: '1000', THROTTLE_AUTH_LIMIT: '100', STORAGE_PROVIDER: 'local', S3_ACCESS_KEY_ID: '', S3_SECRET_ACCESS_KEY: '', S3_BUCKET_NAME: '', S3_ENDPOINT: '', S3_REGION: '', AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', S3_BUCKET: '', PASSWORD_RESET_DELIVERY_URL: '', PASSWORD_RESET_DELIVERY_KEY: '', AUDIT_LOG_WEBHOOK_URL: '', CLAMAV_HOST: '', MALWARE_SCANNER: '', SCANNER_REQUIRED: 'false' };
async function start(args, cwd) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; });
  return { child, output: () => output };
}
async function ready(endpoint, process) {
  for (let i = 0; i < 120; i++) {
    if (process.child.exitCode !== null) throw new Error(`Verification server failed: ${process.output()}`);
    try { const response = await fetch(endpoint); if (response.status < 500) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Verification server timeout: ${process.output()}`);
}
try {
  const clinic = await db.clinic.create({ data: { name: 'Synthetic Browser Clinic', slug: randomUUID(), email, phone: '000', status: 'ACTIVE' } });
  await db.user.create({ data: { clinicId: clinic.id, fullName: 'Synthetic Doctor Owner', email, passwordHash: await bcrypt.hash(password, 10), role: 'ORGANIZATION_ADMIN', isPrimaryContact: true, practitionerVerifiedAt: new Date(), practitionerRegistration: 'SYNTHETIC-VERIFIED' } });
  const patient = await db.patient.create({ data: { clinicId: clinic.id, patientCode: 'browser-patient', firstName: 'Synthetic', lastName: 'Browser Patient', dateOfBirth: new Date('2000-01-01'), mobile: '000' } });
  const consent = await db.patientConsent.create({ data: { clinicId: clinic.id, patientId: patient.id, consentType: 'General', recordedBy: 'Synthetic verifier', status: 'Signed' } });
  const api = await start(['dist/main.js'], process.cwd()); await ready('http://127.0.0.1:3008', api);
  env.VITE_API_BASE_URL = 'http://127.0.0.1:3008';
  const uiBuild = await start(['node_modules/vite/bin/vite.js', 'build', '--outDir', '.verification/browser-dist'], resolve('..'));
  await new Promise((done, fail) => { uiBuild.child.once('exit', code => code === 0 ? done() : fail(new Error('Synthetic UI build failed: ' + uiBuild.output()))); });
  frontend = await start(['node_modules/vite/bin/vite.js', 'preview', '--outDir', '.verification/browser-dist', '--host', '127.0.0.1', '--port', '5188', '--strictPort'], resolve('..')); await ready('http://127.0.0.1:5188', frontend);
  browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge', headless: true });
  page = await browser.newPage({ acceptDownloads: true });
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\.(mp4|webm)(\?.*)?$/, route => route.abort());
  await page.goto('http://127.0.0.1:5188/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type=email]').fill(email); await page.locator('input[type=password]').fill(password);
  const loginResponse = page.waitForResponse(response => response.url().endsWith('/auth/login') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /^sign in/i }).click();
  const token = (await (await loginResponse).json()).token;
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
  await page.goto('http://127.0.0.1:5188/patients/list', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Synthetic Browser Patient', { exact: true })).toBeVisible({ timeout: 15000 });
  if (!token) throw new Error('In-memory login token is missing.');
  if (await page.evaluate(() => !!localStorage.getItem('docmatrix_auth_token') || !!sessionStorage.getItem('docmatrix_auth_token'))) throw new Error('Bearer token leaked to browser persistence.');
  await page.goto('http://127.0.0.1:5188/appointments/queue', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /register walk-in/i }).click();
  const walkIn = page.getByRole('dialog');
  await walkIn.getByPlaceholder(/e.g. Rahul Sharma/i).fill('Synthetic New Walkin');
  await walkIn.getByPlaceholder(/e.g. 9845012345/i).fill('000111222333');
  await walkIn.getByLabel(/Date of birth/).fill('2000-01-02');
  await walkIn.getByLabel('Assign to Dentist').selectOption({ label: await walkIn.getByLabel('Assign to Dentist').locator('option').filter({ hasText: 'Synthetic Doctor Owner' }).first().textContent() });
  await walkIn.getByRole('button', { name: /generate token/i }).click();
  await expect(walkIn).not.toBeVisible();
  const persistedWalkIn = await db.patient.findFirstOrThrow({ where: { clinicId: clinic.id, mobile: '000111222333' } });
  if (!await db.appointment.findFirst({ where: { clinicId: clinic.id, patientId: persistedWalkIn.id, isWalkIn: true } })) throw new Error('New walk-in appointment did not persist.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Synthetic New Walkin', { exact: true }).first()).toBeVisible();
  const workflowResult = await checkClinicWorkflows(db);
  await mkdir('.verification/browser', { recursive: true });
  await writeFile('.verification/browser/workflows.json', JSON.stringify(workflowResult, null, 2));
  await page.goto('http://127.0.0.1:5188/patients/UNKNOWN/tooth-chart', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Patient not found' })).toBeVisible();
  const clinicalDraft = { patientId: patient.id, diagnosis: 'Synthetic verification only', items: [{ medicineName: 'Synthetic test item', dosage: 'test only', frequency: 'test only', duration: 'test only' }] };
  const created = await page.request.post('http://127.0.0.1:3008/prescriptions', { headers: { Authorization: `Bearer ${token}` }, data: clinicalDraft });
  if (created.status() !== 201) throw new Error(`Verified owner clinical write failed: ${created.status()} ${await created.text()}`);
  const createdPrescription = await created.json();
  const finalized = await page.request.post(`http://127.0.0.1:3008/prescriptions/${createdPrescription.id}/finalize`, { headers: { Authorization: `Bearer ${token}` }, data: {} });
  if (finalized.status() !== 201) throw new Error('Verified owner could not finalize the prescription.');
  await page.goto('http://127.0.0.1:5188/clinical/prescriptions', { waitUntil: 'domcontentloaded' });
  await page.getByTitle('Print / Save PDF').first().click();
  await expect(page.locator('#printable-prescription')).toContainText('Synthetic Browser Clinic');
  await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeEnabled();
  await page.evaluate(() => { window.print = () => { window.__syntheticPrinted = true; }; });
  await page.getByRole('button', { name: 'Print / Save as PDF' }).click();
  if (!await page.evaluate(() => window.__syntheticPrinted === true)) throw new Error('Prescription print action failed.');
    await db.user.update({ where: { email }, data: { practitionerVerifiedAt: null, practitionerRegistration: null } });
  const denied = await page.request.post('http://127.0.0.1:3008/prescriptions', { headers: { Authorization: `Bearer ${token}` }, data: clinicalDraft });
  if (denied.status() !== 403) throw new Error('Unverified owner retained clinical writing access.');

  // Routes are read from source rather than duplicated in the verification script.
  const registry = await (await import('node:fs/promises')).readFile('../src/features/registry.ts', 'utf8');
  const route = id => {
    const block = registry.slice(registry.indexOf(`"id": "${id}"`));
    return block.match(/"route":\s*"([^"]+)"/)[1];
  };
  await page.goto(`http://127.0.0.1:5188${route('set.security')}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Database recovery verification' })).toBeVisible();
  await page.goto(`http://127.0.0.1:5188${route('set.privacy')}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Signed', { exact: true }).first()).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /withdraw/i }).click();
  await expect(page.getByText('Consent withdrawn successfully.')).toBeVisible();
  if ((await db.patientConsent.findUniqueOrThrow({ where: { id: consent.id } })).status !== 'Revoked') throw new Error('Consent did not persist.');
  await page.goto(`http://127.0.0.1:5188${route('set.data')}`, { waitUntil: 'domcontentloaded' });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Record Archive (.JSON)' }).click();
  const download = await downloadPromise;
  const artifactDir = resolve('.verification/browser'); await mkdir(artifactDir, { recursive: true });
  await download.saveAs(resolve(artifactDir, 'synthetic-record-archive.json'));
  await page.screenshot({ path: resolve(artifactDir, 'record-export.png'), fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(resolve(artifactDir, 'result.json'), JSON.stringify({ passed: true, checks: ['real login', 'new walk-in patient and appointment survive reload', 'patient list', 'honest recovery status', 'persisted consent withdrawal', 'clinic archive download', 'verified owner clinical draft', 'revoked practitioner access denied', 'unknown patient chart blocked', 'finalized prescription print with saved letterhead'], database: 'isolated synthetic PostgreSQL' }, null, 2));
  console.log('Browser smoke: ten real UI/API/database checks passed, plus ten real HTTP/database clinic workflows.');
} catch (error) {
  console.error('Verification failure:', error.message);
  const dir = resolve('.verification/browser'); await mkdir(dir, { recursive: true });
  if (page) { await page.screenshot({ path: resolve(dir, 'failure.png'), fullPage: true }).catch(() => {}); console.error('Browser page:', (await page.locator('body').innerText().catch(() => '')).slice(0, 3000)); }
  console.error('Browser errors:', errors); console.error('Frontend output:', frontend?.output().slice(-5000));
  throw error;
} finally {
  await browser?.close();
  for (const child of children.reverse()) if (child.exitCode === null) { const stopped = new Promise(resolve => child.once('exit', resolve)); child.kill(); await stopped; }
  await db.$disconnect();
}
