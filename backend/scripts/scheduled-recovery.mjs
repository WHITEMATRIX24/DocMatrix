// Run from backend/. Source database is read-only. Offsite upload is explicit in this job.
import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const required = ['DATABASE_URL','BACKUP_ENCRYPTION_KEY','BACKUP_AWS_ACCESS_KEY_ID','BACKUP_AWS_SECRET_ACCESS_KEY','BACKUP_S3_BUCKET'];
if (required.some(key => !process.env[key])) throw new Error('Backup credentials, encryption key and dedicated destination must be configured.');
if (process.env.BACKUP_AWS_ACCESS_KEY_ID === process.env.AWS_ACCESS_KEY_ID) throw new Error('Use separate backup access credentials.');
if (process.env.BACKUP_ENDPOINT_URL && new URL(process.env.BACKUP_ENDPOINT_URL).protocol !== 'https:') throw new Error('Offsite storage must use HTTPS.');
function run(script, args = [], env = process.env) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [script, ...args], { env, stdio: 'inherit', windowsHide: true });
    child.once('error', fail); child.once('exit', code => code === 0 ? done() : fail(new Error('Recovery verification failed.')));
  });
}
await run('scripts/release-recovery.mjs');
const candidates = (await readdir('.verification', { withFileTypes: true })).filter(entry => entry.isDirectory() && /^release-/.test(entry.name)).map(entry => entry.name).sort();
if (!candidates.length) throw new Error('No recovery proof available.');
await run('scripts/verify-offsite-backup.mjs', [resolve('.verification', candidates.at(-1), 'proof.json')], {
  ...process.env, AWS_ACCESS_KEY_ID: process.env.BACKUP_AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: process.env.BACKUP_AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT_URL_S3: process.env.BACKUP_ENDPOINT_URL || '', S3_BUCKET: process.env.BACKUP_S3_BUCKET,
  AWS_REGION: process.env.BACKUP_AWS_REGION || process.env.AWS_REGION,
});
