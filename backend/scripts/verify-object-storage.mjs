// Harmless random probe only: no patient data, policy changes or existing object deletion.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, GetBucketVersioningCommand } from '@aws-sdk/client-s3';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
const client = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3 || undefined, region: process.env.AWS_REGION || 'ap-southeast-1', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }, forcePathStyle: true, maxAttempts: 2 });
const Bucket = process.env.S3_BUCKET || 'uploads';
const Key = `operations/verification/docmatrix-${randomUUID()}.bin`;
const bytes = randomBytes(1024), sha = value => createHash('sha256').update(value).digest('hex');
const proof = { verifiedAt: new Date().toISOString(), scope: 'generated random bytes only', roundTripVerified: false, probeDeleted: false };
let uploaded = false;
try {
  await client.send(new PutObjectCommand({ Bucket, Key, Body: bytes, ContentType: 'application/octet-stream' })); uploaded = true;
  const response = await client.send(new GetObjectCommand({ Bucket, Key }));
  if (sha(await response.Body.transformToByteArray()) !== sha(bytes)) throw new Error('Object storage checksum mismatch.');
  proof.roundTripVerified = true;
  try { const result = await client.send(new GetBucketVersioningCommand({ Bucket })); proof.versioning = result.Status || 'not enabled'; }
  catch (error) { proof.versioning = `unverified (${error.name})`; }
} catch (error) { console.error(`Object storage probe failed (${error.name}).`); process.exitCode = 1; }
finally {
  if (uploaded) {
    try { await client.send(new DeleteObjectCommand({ Bucket, Key })); proof.probeDeleted = true; }
    catch { console.error('Probe cleanup needs retry; its exact key is retained in private proof.'); proof.cleanupKey = Key; process.exitCode = 1; }
  }
  await mkdir('.verification', { recursive: true });
  await writeFile('.verification/object-storage-proof.json', JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof)); client.destroy();
}
