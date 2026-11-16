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

    it('rejects secrets shorter than 16 characters for cryptographic strength', () => {
      expect(() => validateJwtSecret('short-secret')).toThrowError(
        /JWT_SECRET must be at least 16 characters long/,
      );
    });

    it('accepts valid, sufficiently long unique secrets', () => {
      const valid = 'docmatrix-secure-production-signing-secret-key-2026';
      expect(validateJwtSecret(valid)).toBe(valid);
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
    const testSecret = 'docmatrix-unit-test-secret-key-32chars!!';
    const jwtService = new JwtService({
      secret: testSecret,
      signOptions: {
        algorithm: JWT_ALGORITHM,
        expiresIn: '1h',
      },
    });

    it('signs and verifies valid tokens using pinned HS256 algorithm', () => {
      const payload = { sub: 'usr-123', email: 'doctor@docmatrix.com', role: 'DOCTOR' };
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

