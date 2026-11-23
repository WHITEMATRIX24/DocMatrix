// Consistent application-database backup, encrypted artifact and isolated restore rehearsal.
// The shared database is read-only throughout this command.
import { Client } from 'pg';
import { spawn } from 'node:child_process';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';
import { rootCertificates } from 'node:tls';
import { userInfo } from 'node:os';
import { resolve, sep, join } from 'node:path';
import { mkdir, writeFile, readFile, appendFile, unlink, rm } from 'node:fs/promises';

const workspace = resolve('..');
const directory = resolve('.verification', `release-${new Date().toISOString().replace(/[:.]/g, '-')}`);
if (!directory.startsWith(workspace + sep)) throw new Error('Unsafe recovery directory');
await mkdir(directory, { recursive: true, mode: 0o700 });
const bin = process.env.POSTGRES_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const exe = name => join(bin, process.platform === 'win32' ? `${name}.exe` : name);
const log = join(directory, 'operations.log');
async function run(command, args, env = process.env) {
  return new Promise((done, fail) => {
    const child = spawn(command, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; }); child.stderr.on('data', data => { output += data; });
    child.once('error', fail);
    child.once('exit', async code => {
      await appendFile(log, output);
      if (code === 0) done(output); else fail(new Error(`Recovery operation failed (${command.split(/[\\/]/).pop()}); details retained in private operations.log`));
    });
  });
}
if (process.platform === 'win32') await run('icacls.exe', [directory, '/inheritance:r', '/grant:r', `${userInfo().username}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F']);
const source = new URL(process.env.DATABASE_URL);
const ca = rootCertificates.join('\n');
const caFile = join(directory, 'root-certificates.pem'); await writeFile(caFile, ca);
const sourceConfig = { host: source.hostname, port: Number(source.port || 5432), user: decodeURIComponent(source.username), password: decodeURIComponent(source.password), database: decodeURIComponent(source.pathname.slice(1)), ssl: { ca, rejectUnauthorized: true } };
const sourceEnv = { ...process.env, PGHOST: sourceConfig.host, PGPORT: String(sourceConfig.port), PGUSER: sourceConfig.user, PGPASSWORD: sourceConfig.password, PGDATABASE: sourceConfig.database, PGSSLMODE: 'verify-full', PGSSLROOTCERT: caFile };
const quote = name => `"${name.replaceAll('"', '""')}"`;
async function fingerprints(client) {
  const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  const result = {};
  for (const { tablename } of tables) {
    const row = (await client.query(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text)), '')) AS digest FROM public.${quote(tablename)} t`)).rows[0];
    result[tablename] = row;
  }
  return result;
}
const proof = { createdAt: new Date().toISOString(), scope: 'public schema including application migration history', directory, sharedDatabaseChanged: false };
let server, original;
const restoreDir = join(directory, 'restore-data');
try {
  let keyHex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyHex) {
    keyHex = randomBytes(32).toString('hex');
    await appendFile(resolve('.env'), `\n# AES-256-GCM recovery archive key; escrow separately before relying on disaster recovery.\nBACKUP_ENCRYPTION_KEY="${keyHex}"\n`);
  }
  if (!/^[a-f0-9]{64}$/i.test(keyHex)) throw new Error('BACKUP_ENCRYPTION_KEY must be 32 random bytes encoded as hex');
  const key = Buffer.from(keyHex, 'hex');
  const dumpFile = join(directory, 'database.dump');
  original = new Client(sourceConfig); await original.connect();
  await original.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await original.query("SET LOCAL TIME ZONE 'UTC'");
  const snapshot = (await original.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
  proof.serverVersion = (await original.query('SHOW server_version')).rows[0].server_version;
  proof.source = await fingerprints(original);
  proof.migrations = (await original.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY migration_name')).rows;
  await run(exe('pg_dump'), ['--format=custom', '--schema=public', '--no-owner', '--no-acl', `--snapshot=${snapshot}`, `--file=${dumpFile}`], sourceEnv);
  await original.query('COMMIT'); await original.end(); original = null;
  const data = await readFile(dumpFile);
  proof.dumpSha256 = createHash('sha256').update(data).digest('hex');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const encrypted = Buffer.concat([Buffer.from('DMXB1'), iv, cipher.getAuthTag(), ciphertext]);
  const archive = join(directory, 'database.dump.aesgcm'); await writeFile(archive, encrypted);
  proof.encryptedSha256 = createHash('sha256').update(encrypted).digest('hex');
  const fromDisk = await readFile(archive), decipher = createDecipheriv('aes-256-gcm', key, fromDisk.subarray(5, 17));
  decipher.setAuthTag(fromDisk.subarray(17, 33));
  const recovered = Buffer.concat([decipher.update(fromDisk.subarray(33)), decipher.final()]);
  if (createHash('sha256').update(recovered).digest('hex') !== proof.dumpSha256) throw new Error('Encrypted archive recovery integrity failed');
  const recoveredFile = join(directory, 'recovered.dump'); await writeFile(recoveredFile, recovered);
  const password = randomBytes(24).toString('hex');
  const pwfile = join(directory, 'restore-password.tmp'); await writeFile(pwfile, password);
  try { await run(exe('initdb'), ['-D', restoreDir, '-U', 'release_restore', '--auth=scram-sha-256', `--pwfile=${pwfile}`, '--encoding=UTF8', '--locale=C']); }
  finally { await unlink(pwfile).catch(() => {}); }
  server = spawn(exe('postgres'), ['-D', restoreDir, '-p', '55442', '-h', '127.0.0.1'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  await new Promise((done, fail) => {
    const timeout = setTimeout(() => fail(new Error('Restore cluster startup timed out')), 30000);
    server.once('error', fail); server.once('exit', code => { clearTimeout(timeout); fail(new Error(`Restore cluster exited ${code}`)); });
    server.stderr.on('data', chunk => { if (chunk.toString().includes('database system is ready to accept connections')) { clearTimeout(timeout); done(); } });
  });
  const targetEnv = { ...process.env, PGHOST: '127.0.0.1', PGPORT: '55442', PGUSER: 'release_restore', PGPASSWORD: password, PGDATABASE: 'postgres', PGSSLMODE: 'disable' };
  // The source emits vendor-only pg_attver column metadata. Keep the original
  // encrypted archive intact; remove only those schema statements for stock PG.
  // Data is restored directly from the archive, never passed through a filter.
  const preData = join(directory, 'restore-schema.sql');
  await run(exe('pg_restore'), ['--section=pre-data', '--clean', '--if-exists', '--no-owner', '--no-acl', `--file=${preData}`, recoveredFile], targetEnv);
  const schemaSql = await readFile(preData, 'utf8');
  const vendorLines = schemaSql.match(/^ALTER TABLE ONLY .+ ALTER COLUMN .+ SET \(pg_attver=\d+\);\r?$/gm) || [];
  await writeFile(preData, schemaSql.replace(/^ALTER TABLE ONLY .+ ALTER COLUMN .+ SET \(pg_attver=\d+\);\r?$/gm, ''));
  proof.portability = { removedVendorColumnMetadataStatements: vendorLines.length, unchangedArchive: true };
  await run(exe('psql'), ['-X', '--set=ON_ERROR_STOP=on', '--dbname=postgres', `--file=${preData}`], targetEnv);
  await run(exe('pg_restore'), ['--section=data', '--section=post-data', '--exit-on-error', '--no-owner', '--no-acl', '--dbname=postgres', recoveredFile], targetEnv);
  await unlink(preData);
  const target = new Client({ host: '127.0.0.1', port: 55442, user: 'release_restore', password, database: 'postgres' });
  await target.connect(); await target.query("SET TIME ZONE 'UTC'");
  const restored = await fingerprints(target); await target.end();
  if (JSON.stringify(restored) !== JSON.stringify(proof.source)) throw new Error('Restored row counts or content digests differ');
  proof.restoreVerified = true;
  console.log(`Verified encrypted recovery of ${Object.keys(restored).length} application tables.`);
  const cloneEnv = { ...process.env, DATABASE_URL: `postgresql://release_restore:${password}@127.0.0.1:55442/postgres?schema=public` };
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], cloneEnv);
  await run(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'diff', '--from-schema-datasource', 'prisma/schema.prisma', '--to-schema-datamodel', 'prisma/schema.prisma', '--exit-code'], cloneEnv);
  proof.migrationRehearsalVerified = true;
  await unlink(dumpFile); await unlink(recoveredFile);
  console.log('Migration rehearsal passed on the restored copy. Shared database remains unchanged.');
} catch (error) {
  proof.failure = error.message;
  console.error(error.message); process.exitCode = 1;
} finally {
  await original?.end().catch(() => {});
  await unlink(join(directory, 'database.dump')).catch(() => {});
  await unlink(join(directory, 'recovered.dump')).catch(() => {});
  await unlink(join(directory, 'restore-schema.sql')).catch(() => {});
  if (server && server.exitCode === null) { const ended = new Promise(done => server.once('exit', done)); server.kill(); await ended; }
  await writeFile(join(directory, 'proof.json'), JSON.stringify(proof, null, 2));
  // This is newly created recovery scratch, never a user-selected directory.
  if (restoreDir.startsWith(directory + sep) && directory.startsWith(workspace + sep)) await rm(restoreDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  console.log(`Recovery evidence: ${join(directory, 'proof.json')}`);
}
