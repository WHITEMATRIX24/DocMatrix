export function validateProductionSecurity(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const required = ['DATABASE_URL', 'JWT_SECRET', 'AUTH_ENCRYPTION_KEY', 'REDIS_URL', 'S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'PUBLIC_APP_URL', 'PASSWORD_RESET_DELIVERY_URL', 'PASSWORD_RESET_DELIVERY_KEY', 'AUDIT_LOG_WEBHOOK_URL', 'AUDIT_LOG_API_KEY'];
  const missing = required.filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Production security configuration missing: ${missing.join(', ')}`);
  for (const key of ['PUBLIC_APP_URL', 'PASSWORD_RESET_DELIVERY_URL', 'AUDIT_LOG_WEBHOOK_URL']) {
    const url = new URL(env[key]!);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`${key} must use HTTPS without URL credentials.`);
  }
  const database = new URL(env.DATABASE_URL!);
  if (!['require', 'verify-ca', 'verify-full'].includes(database.searchParams.get('sslmode') || '')) throw new Error('Production database TLS is required.');
  if (!/^[a-f0-9]{64}$/i.test(env.AUTH_ENCRYPTION_KEY!)) throw new Error('AUTH_ENCRYPTION_KEY must be 32 random bytes encoded as hex.');
  if (env.RATE_LIMIT_STORE !== 'redis') throw new Error('Production requires a shared Redis rate-limit store.');
  if (!env.CORS_ALLOWED_ORIGINS || env.CORS_ALLOWED_ORIGINS.split(',').some(origin => new URL(origin.trim()).protocol !== 'https:')) throw new Error('Production requires explicit HTTPS frontend origins.');
  if (!env.CLAMAV_HOST) throw new Error('Production requires an external ClamAV scanner.');
}
