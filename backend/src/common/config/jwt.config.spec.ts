import { randomBytes } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import {
  validateJwtSecret,
  JWT_ALGORITHM,
  KNOWN_UNSAFE_SECRETS,
} from './jwt.config.js';

describe('JWT Secret Protection & Algorithm Validation (SEC-002)', () => {
  describe('validateJwtSecret (Configuration Validation)', () => {
    it('throws when JWT_SECRET is undefined', () => {
      expect(() => validateJwtSecret(undefined)).toThrowError(
        /JWT_SECRET environment variable is missing/,
      );
    });

    it('throws when JWT_SECRET is empty or whitespace', () => {
      expect(() => validateJwtSecret('')).toThrowError(
        /JWT_SECRET environment variable is empty/,
      );
      expect(() => validateJwtSecret('   ')).toThrowError(
        /JWT_SECRET environment variable is empty/,
      );
    });

    it('rejects known unsafe development fallback secrets', () => {
      for (const unsafe of KNOWN_UNSAFE_SECRETS) {
        expect(() => validateJwtSecret(unsafe)).toThrowError(
          /JWT_SECRET is set to a known unsafe default fallback/,
        );
        // Case-insensitive check
        expect(() => validateJwtSecret(unsafe.toUpperCase())).toThrowError(
          /JWT_SECRET is set to a known unsafe default fallback/,
        );
      }
    });

    it('rejects short passphrases', () => {
      expect(() => validateJwtSecret('short-secret')).toThrowError(
        /JWT_SECRET must encode at least 32 random bytes/,
      );
    });

    it('accepts valid, sufficiently long unique secrets', () => {
      const valid = randomBytes(32).toString('hex');
      expect(validateJwtSecret(valid)).toBe(valid);
    });

    it('accepts canonical base64 encoding of a generated 256-bit key', () => {
      const valid = randomBytes(32).toString('base64');
      expect(validateJwtSecret(valid)).toBe(valid);
    });

    it.each([
      'a'.repeat(64),
      Buffer.alloc(32, 1).toString('hex'),
      Buffer.from('0123456789abcdef'.repeat(2)).toString('hex'),
      Buffer.alloc(31, 7).toString('base64'),
      'a-long-human-readable-passphrase-is-not-a-generated-key',
    ])(
      'rejects weak, repetitive, undersized, or incorrectly encoded key #%#',
      (candidate) => {
        expect(() => validateJwtSecret(candidate)).toThrow(/JWT_SECRET/);
      },
    );

    it('rejects non-canonical base64 encodings', () => {
      const bytes = Buffer.from(Array.from({ length: 32 }, (_, i) => i));
      const canonical = bytes.toString('base64');
      const alphabet =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const index = alphabet.indexOf(canonical[42]);
      const nonCanonical = canonical.slice(0, 42) + alphabet[index + 1] + '=';
      expect(() => validateJwtSecret(nonCanonical)).toThrow(/canonical base64/);
    });

    it('never leaks secret values in error messages', () => {
      const candidateSecret = 'short';
      try {
        validateJwtSecret(candidateSecret);
      } catch (err: any) {
        expect(err.message).not.toContain(candidateSecret);
      }
    });
  });

  describe('JWT Signing & Verification Integration', () => {
    const testSecret = randomBytes(32).toString('hex');
    const jwtService = new JwtService({
      secret: testSecret,
      signOptions: {
        algorithm: JWT_ALGORITHM,
        expiresIn: '1h',
      },
    });

    it('signs and verifies valid tokens using pinned HS256 algorithm', () => {
      const payload = {
        sub: 'usr-123',
        email: 'doctor@docmatrix.com',
        role: 'DOCTOR',
      };
      const token = jwtService.sign(payload);

      const decoded = jwtService.verify(token, {
        secret: testSecret,
        algorithms: [JWT_ALGORITHM],
      });

      expect(decoded.sub).toBe('usr-123');
      expect(decoded.email).toBe('doctor@docmatrix.com');
      expect(decoded.role).toBe('DOCTOR');
    });

    it('rejects tokens signed with an incorrect secret', () => {
      const payload = { sub: 'usr-123' };
      const attackerJwtService = new JwtService({
        secret: 'attacker-forged-secret-key-32chars!!',
        signOptions: { algorithm: JWT_ALGORITHM },
      });
      const forgedToken = attackerJwtService.sign(payload);

      expect(() =>
        jwtService.verify(forgedToken, {
          secret: testSecret,
          algorithms: [JWT_ALGORITHM],
        }),
      ).toThrowError(/invalid signature/);
    });

    it('rejects tokens when algorithm is manipulated or unpinned (algorithm confusion)', () => {
      const payload = { sub: 'usr-123' };
      const token = jwtService.sign(payload);

      // Verifying with disallowed algorithm list must reject
      expect(() =>
        jwtService.verify(token, {
          secret: testSecret,
          algorithms: ['RS256'] as any,
        }),
      ).toThrowError(/invalid algorithm/);
    });
  });
});
