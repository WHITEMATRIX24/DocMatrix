import { NotFoundException } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service.js';

describe('EnquiriesService - Online Enquiries & Multi-Tenant Isolation', () => {
  let service: EnquiriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      enquiry: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new EnquiriesService(mockPrisma);
  });

  it('retrieves only enquiries belonging to the authenticated clinic', async () => {
    const clinicEnquiries = [
      {
        id: 'enq-1',
        clinicId: 'clinic-A',
        name: 'Ananya Pillai',
        request: 'New patient · Cleaning',
        status: 'PENDING',
        createdAt: new Date(),
      },
    ];

    mockPrisma.enquiry.findMany.mockResolvedValue(clinicEnquiries);

    const result = await service.getAllEnquiries('clinic-A', { status: 'PENDING' });

    expect(result).toEqual(clinicEnquiries);
    expect(mockPrisma.enquiry.findMany).toHaveBeenCalledWith({
      where: { clinicId: 'clinic-A', status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('throws NotFoundException when accessing enquiry of another clinic', async () => {
    mockPrisma.enquiry.findFirst.mockResolvedValue(null);

    await expect(
      service.getEnquiryById('clinic-A', 'enquiry-of-clinic-B'),
    ).rejects.toThrow(NotFoundException);

    expect(mockPrisma.enquiry.findFirst).toHaveBeenCalledWith({
      where: { id: 'enquiry-of-clinic-B', clinicId: 'clinic-A' },
    });
  });

  it('creates an enquiry scoped to the authenticated clinic', async () => {
    const newEnquiry = {
      id: 'enq-2',
      clinicId: 'clinic-A',
      name: 'Vivek Menon',
      phone: '+91 98460 11223',
      email: 'vivek@example.com',
      request: 'Tooth pain consultation',
      status: 'PENDING',
      notes: 'Morning preferred',
    };

    mockPrisma.enquiry.create.mockResolvedValue(newEnquiry);

    const result = await service.createEnquiry('clinic-A', {
      name: 'Vivek Menon',
      phone: '+91 98460 11223',
      email: 'vivek@example.com',
      request: 'Tooth pain consultation',
      notes: 'Morning preferred',
    });

    expect(result).toEqual(newEnquiry);
    expect(mockPrisma.enquiry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clinicId: 'clinic-A',
        name: 'Vivek Menon',
        request: 'Tooth pain consultation',
        status: 'PENDING',
      }),
    });
  });

  it('updates enquiry status when authorized', async () => {
    mockPrisma.enquiry.findFirst.mockResolvedValue({
      id: 'enq-1',
      clinicId: 'clinic-A',
      status: 'PENDING',
    });

    mockPrisma.enquiry.update.mockResolvedValue({
      id: 'enq-1',
      clinicId: 'clinic-A',
      status: 'CONVERTED',
    });

    const result = await service.updateEnquiry('clinic-A', 'enq-1', {
      status: 'CONVERTED',
    });

    expect(result.status).toBe('CONVERTED');
    expect(mockPrisma.enquiry.update).toHaveBeenCalledWith({
      where: { id: 'enq-1' },
      data: { status: 'CONVERTED' },
    });
  });

  it('deletes/dismisses enquiry securely', async () => {
    mockPrisma.enquiry.findFirst.mockResolvedValue({
      id: 'enq-1',
      clinicId: 'clinic-A',
    });
    mockPrisma.enquiry.delete.mockResolvedValue({ id: 'enq-1' });

    const result = await service.deleteEnquiry('clinic-A', 'enq-1');

    expect(result.success).toBe(true);
    expect(mockPrisma.enquiry.delete).toHaveBeenCalledWith({
      where: { id: 'enq-1' },
    });
  });
});
