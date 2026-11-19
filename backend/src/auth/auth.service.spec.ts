import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;
  let mockJwt: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      clinic: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    mockJwt = {
      sign: vi.fn().mockReturnValue('mock-jwt-token-xyz'),
    };

    const mockSession = {
      id: 'session-123',
      userId: 'usr-1',
      tokenHash: 'hash-abc',
      familyId: 'family-1',
      isRevoked: false,
    };
    const mockSessionService = {
      createSession: vi
        .fn()
        .mockResolvedValue({
          session: mockSession,
          refreshToken: 'refresh-token-xyz',
        }),
      rotateRefreshToken: vi.fn(),
      isSessionValid: vi.fn().mockReturnValue(true),
      revokeSession: vi.fn(),
      revokeSessionByRefreshToken: vi.fn(),
      revokeAllUserSessions: vi.fn().mockReturnValue(1),
    };

    service = new AuthService(
      mockPrisma,
      mockJwt,
      mockSessionService as any,
      undefined,
      { recordEvent: vi.fn() } as any,
    );
  });

  it('rejects login if user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'unknown@docmatrix.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login if account is deactivated (isActive = false)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-inactive',
      email: 'inactive@docmatrix.com',
      isActive: false,
    });

    await expect(
      service.login({
        email: 'inactive@docmatrix.com',
        password: 'password123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('logs in successfully and returns JWT when credentials match', async () => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('CorrectPass@123', salt);

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'dr.arun@docmatrix.com',
      fullName: 'Dr. Arun Kumar',
      passwordHash: hash,
      role: 'ORGANIZATION_ADMIN',
      clinicId: 'clinic-1',
      isPlatformAdmin: false,
      isPrimaryContact: true,
      isActive: true,
      clinic: { name: 'Apollo Dental', status: 'ACTIVE' },
    });

    const response = await service.login({
      email: 'dr.arun@docmatrix.com',
      password: 'CorrectPass@123',
    });

    expect(response.token).toBe('mock-jwt-token-xyz');
    expect(mockJwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'usr-1', sessionId: 'session-123' }),
    );
    expect(response.user.email).toBe('dr.arun@docmatrix.com');
    expect(response.user.role).toBe('ORGANIZATION_ADMIN');
    expect(response.user.clinicName).toBe('Apollo Dental');
  });

  describe('changePassword', () => {
    it('successfully changes password when current password matches', async () => {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('OldPassword123!', salt);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        passwordHash: hash,
      });
      mockPrisma.user.update = vi.fn().mockResolvedValue({ id: 'usr-1' });

      const res = await service.changePassword(
        'usr-1',
        'OldPassword123!',
        'NewPassword456!',
      );
      expect(res.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('rejects password change when current password is wrong', async () => {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('RealPassword123!', salt);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr-1',
        passwordHash: hash,
      });

      await expect(
        service.changePassword('usr-1', 'WrongPassword!', 'NewPassword456!'),
      ).rejects.toThrow();
    });
  });
});
