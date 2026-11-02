import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';

@Injectable()
export class ClinicsService {
  constructor(private prisma: PrismaService) {}

  async getClinic(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
          },
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found.');
    }

    return clinic;
  }

  async updateClinic(clinicId: string, dto: UpdateClinicDto) {
    await this.getClinic(clinicId);

    return this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.phone && { phone: dto.phone.trim() }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
        ...(dto.state !== undefined && { state: dto.state?.trim() || null }),
        ...(dto.country !== undefined && { country: dto.country?.trim() || 'India' }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode?.trim() || null }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone?.trim() || 'Asia/Kolkata' }),
        ...(dto.currency !== undefined && { currency: dto.currency?.trim() || 'INR' }),
        ...(dto.practiceType !== undefined && { practiceType: dto.practiceType?.trim() || 'Solo' }),
      },
    });
  }

  async getClinicStaff(clinicId: string) {
    return this.prisma.user.findMany({
      where: { clinicId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        isPrimaryContact: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addStaff(clinicId: string, dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    return this.prisma.user.create({
      data: {
        clinicId,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        role: dto.role,
        isPlatformAdmin: false,
        isPrimaryContact: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}

