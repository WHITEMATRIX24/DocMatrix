import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  private calculateAge(dob: Date): number {
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  private serializePatient(patient: any) {
    const dob = patient.dateOfBirth instanceof Date ? patient.dateOfBirth : new Date(patient.dateOfBirth);
    const age = this.calculateAge(dob);

    return {
      id: patient.id,
      clinicId: patient.clinicId,
      patientCode: patient.patientCode,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: `${patient.firstName} ${patient.lastName}`.trim(),
      dateOfBirth: dob.toISOString().slice(0, 10),
      age: String(age),
      gender: patient.gender.toLowerCase(),
      mobile: patient.mobile,
      countryCode: patient.countryCode || '+91',
      email: patient.email || '',
      city: patient.city || '',
      state: patient.state || '',
      postalCode: patient.postalCode || '',
      address: patient.address || '',
      emergencyName: patient.emergencyName || '',
      emergencyPhone: patient.emergencyPhone || '',
      relationship: patient.relationship || '',
      medicalSafetyAlerts: patient.medicalSafetyAlerts || null,
      isActive: patient.isActive,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString(),
      appointments: patient.appointments,
    };
  }

  async listPatients(clinicId: string, query: PatientQueryDto) {
    const where: any = {
      clinicId,
      ...(!query.includeArchived && { isActive: true }),
    };

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { mobile: { contains: s } },
        { patientCode: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query.alertsOnly) {
      where.medicalSafetyAlerts = { not: null };
    }

    const patients = await this.prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((p) => this.serializePatient(p));
  }

  async getPatient(clinicId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id }, { patientCode: id }],
      },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found.');
    }

    return this.serializePatient(patient);
  }

  async createPatient(clinicId: string, dto: CreatePatientDto) {
    let code = dto.patientCode?.trim();
    if (!code) {
      const count = await this.prisma.patient.count({ where: { clinicId } });
      code = `pt-${1001 + count}`;
    }

    const existingCode = await this.prisma.patient.findUnique({
      where: {
        clinicId_patientCode: {
          clinicId,
          patientCode: code,
        },
      },
    });

    if (existingCode) {
      code = `pt-${1001 + (await this.prisma.patient.count({ where: { clinicId } }))}-${Date.now().toString().slice(-4)}`;
    }

    const dob = new Date(dto.dateOfBirth);

    const created = await this.prisma.patient.create({
      data: {
        clinicId,
        patientCode: code,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        dateOfBirth: dob,
        gender: dto.gender || 'UNDISCLOSED',
        mobile: dto.mobile.trim(),
        countryCode: dto.countryCode?.trim() || '+91',
        email: dto.email?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim() || null,
        postalCode: dto.postalCode?.trim() || null,
        address: dto.address?.trim() || null,
        emergencyName: dto.emergencyName?.trim() || null,
        emergencyPhone: dto.emergencyPhone?.trim() || null,
        relationship: dto.relationship?.trim() || null,
        medicalSafetyAlerts: dto.medicalSafetyAlerts || null,
        isActive: true,
      },
    });

    return this.serializePatient(created);
  }

  async updatePatient(clinicId: string, id: string, dto: UpdatePatientDto) {
    const patient = await this.getPatient(clinicId, id);

    const updated = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...(dto.firstName && { firstName: dto.firstName.trim() }),
        ...(dto.lastName && { lastName: dto.lastName.trim() }),
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
        ...(dto.gender && { gender: dto.gender }),
        ...(dto.mobile && { mobile: dto.mobile.trim() }),
        ...(dto.countryCode && { countryCode: dto.countryCode.trim() }),
        ...(dto.email !== undefined && { email: dto.email?.trim() || null }),
        ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
        ...(dto.state !== undefined && { state: dto.state?.trim() || null }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode?.trim() || null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.emergencyName !== undefined && { emergencyName: dto.emergencyName?.trim() || null }),
        ...(dto.emergencyPhone !== undefined && { emergencyPhone: dto.emergencyPhone?.trim() || null }),
        ...(dto.relationship !== undefined && { relationship: dto.relationship?.trim() || null }),
        ...(dto.medicalSafetyAlerts !== undefined && { medicalSafetyAlerts: dto.medicalSafetyAlerts }),
      },
    });

    return this.serializePatient(updated);
  }

  async archivePatient(clinicId: string, id: string) {
    const patient = await this.getPatient(clinicId, id);

    const archived = await this.prisma.patient.update({
      where: { id: patient.id },
      data: { isActive: false },
    });

    return {
      message: 'Patient record archived successfully.',
      patient: this.serializePatient(archived),
    };
  }
}

