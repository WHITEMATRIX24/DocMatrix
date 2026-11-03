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

    service = new AuthService(mockPrisma, mockJwt);
  });

  it('rejects login if user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@docmatrix.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects login if account is deactivated (isActive = false)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-inactive',
      email: 'inactive@docmatrix.com',
      isActive: false,
    });

    await expect(
      service.login({ email: 'inactive@docmatrix.com', password: 'password123' }),
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
      clinic: { name: 'Apollo Dental' },
    });

    const response = await service.login({
      email: 'dr.arun@docmatrix.com',
      password: 'CorrectPass@123',
    });

    expect(response.token).toBe('mock-jwt-token-xyz');
    expect(response.user.email).toBe('dr.arun@docmatrix.com');
    expect(response.user.role).toBe('ORGANIZATION_ADMIN');
    expect(response.user.clinicName).toBe('Apollo Dental');
  });
});

