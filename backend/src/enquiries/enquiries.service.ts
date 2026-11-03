import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEnquiryDto } from './dto/create-enquiry.dto.js';
import { UpdateEnquiryDto } from './dto/update-enquiry.dto.js';
import { EnquiryQueryDto } from './dto/enquiry-query.dto.js';

@Injectable()
export class EnquiriesService {
  constructor(private prisma: PrismaService) {}

  async getAllEnquiries(clinicId: string, query?: EnquiryQueryDto) {
    const where: any = { clinicId };

    if (query?.status) {
      where.status = query.status.toUpperCase();
    }

    if (query?.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { request: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnquiryById(clinicId: string, id: string) {
    const enquiry = await this.prisma.enquiry.findFirst({
      where: { id, clinicId },
    });

    if (!enquiry) {
      throw new NotFoundException(`Enquiry with ID "${id}" not found.`);
    }

    return enquiry;
  }

  async createEnquiry(clinicId: string, dto: CreateEnquiryDto) {
    return this.prisma.enquiry.create({
      data: {
        clinicId,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        request: dto.request.trim(),
        status: (dto.status?.toUpperCase() as any) || 'PENDING',
        notes: dto.notes?.trim() || null,
      },
    });
  }

  async updateEnquiry(clinicId: string, id: string, dto: UpdateEnquiryDto) {
    await this.getEnquiryById(clinicId, id);

    return this.prisma.enquiry.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email.trim() || null }),
        ...(dto.request !== undefined && { request: dto.request.trim() }),
        ...(dto.status !== undefined && { status: dto.status.toUpperCase() }),
        ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
      },
    });
  }

  async deleteEnquiry(clinicId: string, id: string) {
    await this.getEnquiryById(clinicId, id);

    await this.prisma.enquiry.delete({
      where: { id },
    });

    return { success: true, message: `Enquiry "${id}" dismissed successfully.` };
  }
}
