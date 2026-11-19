import { randomBytes } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getJwtSecret,
  KNOWN_UNSAFE_SECRETS,
} from '../common/config/jwt.config.js';

describe('Finding #1: authentication module startup validation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('rejects a missing key at the early startup validation boundary', () => {
    // main.ts checks this before importing AppModule. Prisma's import-time
    // dotenv loading must not supply a developer key to this missing-key test.
    vi.stubEnv('JWT_SECRET', undefined);
    expect(() => getJwtSecret()).toThrow(
      /JWT_SECRET environment variable is missing/,
    );
  });

  it.each(['audited example', 'new placeholder', 'weak encoded key'])(
    'rejects %s configuration before application initialization',
    async (scenario) => {
      vi.resetModules();
      const secret =
        scenario === 'audited example'
          ? KNOWN_UNSAFE_SECRETS.at(-1)!
          : scenario === 'new placeholder'
            ? 'replace-with-a-generated-jwt-secret'
            : 'a'.repeat(64);
      vi.stubEnv('JWT_SECRET', secret);
      await expect(import('./auth.module.js')).rejects.toThrow(
        /JWT Configuration Fatal Error/,
      );
    },
    45000,
  );

  it('allows authentication module initialization with an independently generated key', async () => {
    vi.resetModules();
    vi.stubEnv('JWT_SECRET', randomBytes(32).toString('hex'));
    await expect(import('./auth.module.js')).resolves.toHaveProperty(
      'AuthModule',
    );
  }, 45000);
});
