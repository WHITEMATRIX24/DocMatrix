import EmbeddedPostgres from 'embedded-postgres';
import { randomBytes } from 'node:crypto';
import { resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
const root = resolve('.verification');
const databaseDir = resolve(root, `postgres-${Date.now()}`);
if (!databaseDir.startsWith(root + sep)) throw new Error('Unsafe database directory');
await mkdir(root, { recursive: true });
const password = randomBytes(24).toString('hex');
const pg = new EmbeddedPostgres({ databaseDir, port: 55440, user: 'batch_security', password, persistent: true, createPostgresUser: false, autoRehydrateSymlinks: true, initdbFlags: ['--encoding=UTF8'], postgresFlags: ['-h', '127.0.0.1'], onLog: m => console.log(m), onError: m => process.stderr.write(String(m) + '\n') });
const url = `postgresql://batch_security:${password}@127.0.0.1:55440/postgres?schema=batch1_security`;
let server;
const env = { ...process.env, DATABASE_URL: url, BATCH1_DATABASE_URL: url, JWT_SECRET: randomBytes(48).toString('hex'), NODE_ENV: 'test' };
function run(args) { return new Promise((resolve, reject) => { const p = spawn(process.execPath, args, { env, stdio: 'inherit' }); p.once('error', reject); p.once('exit', code => code === 0 ? resolve() : reject(new Error(`Command failed (${code})`))); }); }
try {
  console.log('Initializing synthetic cluster'); await pg.initialise();
  const binaries = await import(`@embedded-postgres/${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`);
  server = spawn(binaries.postgres, ['-D', databaseDir, '-p', '55440', '-h', '127.0.0.1'], { stdio: ['ignore', 'ignore', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local PostgreSQL startup timed out')), 30000);
    server.once('error', reject); server.once('exit', code => { clearTimeout(timeout); reject(new Error(`PostgreSQL exited ${code}`)); });
    server.stderr.on('data', chunk => { if (chunk.toString().includes('database system is ready to accept connections')) { clearTimeout(timeout); resolve(); } });
  });
  console.log('Cluster ready');
  await run(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);
  await run(['node_modules/prisma/build/index.js', 'db', 'execute', '--schema', 'prisma/schema.prisma', '--file', 'prisma/migrations/20261119101000_reconcile_existing_integration_schema/migration.sql']);
  await run(['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', ...(process.argv.includes('--documents') ? [] : ['--exit-code'])]);
  if (!process.argv.includes('--browser-only')) await run(['node_modules/vitest/vitest.mjs', 'run', ...(process.argv.includes('--documents') ? ['src/clinical/patient-documents.postgres.spec.ts'] : process.argv.includes('--appointments') ? ['src/appointments/workflow.postgres.spec.ts'] : ['src/security/batch-1.postgres.spec.ts', 'test/auth-real-postgres.spec.ts', 'src/security/hardening.postgres.spec.ts']), '--maxWorkers=1']);
  if (process.argv.includes('--browser') || process.argv.includes('--browser-only')) await run(['scripts/browser-smoke.mjs']);
} finally { if (server && server.exitCode === null) { const exited = new Promise(resolve => server.once('exit', resolve)); server.kill(); await exited; } }
