import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { StaffRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterClinicDto } from './dto/register-clinic.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateCredentials(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { clinic: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated. Please contact support.');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateCredentials(loginDto.email, loginDto.password);

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      isPlatformAdmin: user.isPlatformAdmin,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        fullName: user.fullName,
        role: user.role,
        clinicId: user.clinicId,
        clinicName: user.clinic?.name || null,
        isPlatformAdmin: user.isPlatformAdmin,
        isPrimaryContact: user.isPrimaryContact,
      },
    };
  }

  async registerClinic(dto: RegisterClinicDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const baseSlug = dto.clinicName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'clinic';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: dto.clinicName.trim(),
          slug,
          phone: dto.mobile.trim(),
          email: dto.email.toLowerCase().trim(),
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          country: dto.country?.trim() || 'India',
          address: dto.address?.trim() || null,
          practiceType: dto.practiceType || 'Solo',
        },
      });

      const user = await tx.user.create({
        data: {
          clinicId: clinic.id,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName.trim(),
          phone: dto.mobile.trim(),
          role: StaffRole.ORGANIZATION_ADMIN,
          isPlatformAdmin: false,
          isPrimaryContact: true,
          isActive: true,
        },
      });

      return { clinic, user };
    });

    const payload = {
      sub: result.user.id,
      email: result.user.email,
      role: result.user.role,
      clinicId: result.clinic.id,
      isPlatformAdmin: false,
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.fullName,
        fullName: result.user.fullName,
        role: result.user.role,
        clinicId: result.clinic.id,
        clinicName: result.clinic.name,
        isPlatformAdmin: false,
        isPrimaryContact: true,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            phone: true,
            email: true,
            city: true,
            state: true,
            timezone: true,
            currency: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.fullName,
      fullName: user.fullName,
      role: user.role,
      clinicId: user.clinicId,
      clinic: user.clinic,
      isPlatformAdmin: user.isPlatformAdmin,
      isPrimaryContact: user.isPrimaryContact,
      isActive: user.isActive,
    };
  }
}

