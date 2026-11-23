// Read-only deployment check. Never print credentials, clinical records or full URLs.
import { S3Client, GetBucketEncryptionCommand, GetPublicAccessBlockCommand, GetBucketVersioningCommand } from '@aws-sdk/client-s3';
const required = ['DATABASE_URL','JWT_SECRET','AUTH_ENCRYPTION_KEY','REDIS_URL','S3_BUCKET','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','PUBLIC_APP_URL','PASSWORD_RESET_DELIVERY_URL','PASSWORD_RESET_DELIVERY_KEY','AUDIT_LOG_WEBHOOK_URL','AUDIT_LOG_API_KEY','CLAMAV_HOST'];
const checks = required.map(key => ({ check: key, passed: !!process.env[key] }));
if (process.env.PUBLIC_APP_URL) {
  try {
    const response = await fetch(process.env.PUBLIC_APP_URL, { signal: AbortSignal.timeout(10000), redirect: 'error' });
    for (const header of ['content-security-policy','x-content-type-options','strict-transport-security','referrer-policy']) checks.push({ check: `frontend ${header}`, passed: !!response.headers.get(header) });
    checks.push({ check: 'frontend HTTPS', passed: new URL(process.env.PUBLIC_APP_URL).protocol === 'https:' });
  } catch { checks.push({ check: 'frontend reachable without redirect', passed: false }); }
}
if (process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
  const client = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3, region: process.env.AWS_REGION || 'ap-southeast-1', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY }, forcePathStyle: true });
  try {
    const encryption = await client.send(new GetBucketEncryptionCommand({ Bucket: process.env.S3_BUCKET }));
    checks.push({ check: 'bucket default encryption', passed: !!encryption.ServerSideEncryptionConfiguration?.Rules?.length });
    const access = await client.send(new GetPublicAccessBlockCommand({ Bucket: process.env.S3_BUCKET }));
    checks.push({ check: 'bucket public access blocked', passed: Object.values(access.PublicAccessBlockConfiguration || {}).length === 4 && Object.values(access.PublicAccessBlockConfiguration || {}).every(Boolean) });
    const versioning = await client.send(new GetBucketVersioningCommand({ Bucket: process.env.S3_BUCKET }));
    checks.push({ check: 'bucket versioning', passed: versioning.Status === 'Enabled' });
  } catch { checks.push({ check: 'bucket controls accessible and verified', passed: false }); }
  finally { client.destroy(); }
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), readOnly: true, checks }, null, 2));
if (checks.some(check => !check.passed)) process.exitCode = 1;
