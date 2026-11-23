// Upload only a verified, encrypted recovery archive to a new object key.
// No bucket policy, retention setting or existing object is changed.
import { S3Client, PutObjectCommand, GetObjectCommand, GetBucketVersioningCommand } from '@aws-sdk/client-s3';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join, sep } from 'node:path';
import { createHash, createDecipheriv } from 'node:crypto';

const proofPath = resolve(process.argv[2] || '');
const privateRoot = resolve('.verification') + sep;
if (!proofPath.startsWith(privateRoot) || !proofPath.endsWith(`${sep}proof.json`)) throw new Error('Select a recovery proof inside .verification.');
const directory = dirname(proofPath);
const proof = JSON.parse(await readFile(proofPath, 'utf8'));
if (!proof.restoreVerified || !proof.migrationRehearsalVerified) throw new Error('Recovery and migration rehearsal must both pass first.');
const data = await readFile(join(directory, 'database.dump.aesgcm'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(data) !== proof.encryptedSha256) throw new Error('Local archive checksum mismatch.');
const key = Buffer.from(process.env.BACKUP_ENCRYPTION_KEY || '', 'hex');
if (key.length !== 32) throw new Error('Recovery key is missing.');
const client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined,
  region: process.env.AWS_REGION || 'ap-southeast-1',
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY },
  forcePathStyle: true, maxAttempts: 2,
});
const Bucket = process.env.S3_BUCKET || 'uploads';
const Key = `operations/backups/${proof.createdAt.replace(/[:.]/g, '-')}/database.dump.aesgcm`;
try {
  await client.send(new PutObjectCommand({ Bucket, Key, Body: data, ContentType: 'application/octet-stream', Metadata: { sha256: proof.encryptedSha256 } }));
  const response = await client.send(new GetObjectCommand({ Bucket, Key }));
  const recovered = Buffer.from(await response.Body.transformToByteArray());
  if (hash(recovered) !== proof.encryptedSha256) throw new Error('Offsite archive checksum mismatch.');
  if (recovered.subarray(0, 5).toString() !== 'DMXB1') throw new Error('Invalid recovery archive.');
  const decipher = createDecipheriv('aes-256-gcm', key, recovered.subarray(5, 17));
  decipher.setAuthTag(recovered.subarray(17, 33));
  const plaintext = Buffer.concat([decipher.update(recovered.subarray(33)), decipher.final()]);
  if (hash(plaintext) !== proof.dumpSha256) throw new Error('Offsite decryption integrity failed.');
  proof.offsite = { verifiedAt: new Date().toISOString(), key: Key, encryptedRoundTripVerified: true, decryptedChecksumVerified: true };
  try {
    const versioning = await client.send(new GetBucketVersioningCommand({ Bucket }));
    proof.offsite.bucketVersioning = versioning.Status || 'not enabled';
  } catch (error) { proof.offsite.bucketVersioning = `unverified (${error.name})`; }
  await writeFile(proofPath, JSON.stringify(proof, null, 2));
  console.log('Offsite encrypted backup round-trip and decrypted checksum verified.');
  console.log(`Bucket versioning: ${proof.offsite.bucketVersioning}. Key escrow and provider retention still require separate verification.`);
} catch (error) {
  console.error(`Offsite backup verification failed (${error.name}); no existing objects were changed.`);
  process.exitCode = 1;
} finally { client.destroy(); }
