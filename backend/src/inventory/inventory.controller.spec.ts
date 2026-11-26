import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('InventoryController Multi-Tenant Isolation', () => {
  let controller: InventoryController;
  let service: InventoryService;

  const clinicAId = 'clinic-alpha-1111';
  const clinicBId = 'clinic-beta-2222';

  const userClinicA = {
    id: 'user-a',
    email: 'admin@clinica.com',
    role: 'ORGANIZATION_ADMIN',
    clinicId: clinicAId,
    isPlatformAdmin: false,
  } as unknown as AuthenticatedUser;

  const userClinicB = {
    id: 'user-b',
    email: 'admin@clinicb.com',
    role: 'ORGANIZATION_ADMIN',
    clinicId: clinicBId,
    isPlatformAdmin: false,
  } as unknown as AuthenticatedUser;

  beforeEach(() => {
    service = {
      getItems: vi.fn(),
      createItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      receiveBatch: vi.fn(),
      updateBatch: vi.fn(),
      adjustStock: vi.fn(),
      getAudits: vi.fn(),
      confirmDeduction: vi.fn(),
    } as unknown as InventoryService;

    controller = new InventoryController(service);
  });

  it('has JwtAuthGuard and TenantGuard metadata on the controller class', () => {
    const guards = Reflect.getMetadata('__guards__', InventoryController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
    expect(guards).toContain(TenantGuard);
  });

  it('scopes getItems strictly to the authenticated user clinicId', async () => {
    vi.mocked(service.getItems).mockResolvedValueOnce([
      { id: 'item-1', name: 'Dental Gloves', clinicId: clinicAId } as any,
    ]);

    const result = await controller.getItems(userClinicA);

    expect(service.getItems).toHaveBeenCalledWith(clinicAId);
    expect(service.getItems).not.toHaveBeenCalledWith(clinicBId);
    expect(result).toHaveLength(1);
  });

  it('ensures Clinic B getItems receives only Clinic B data and never Clinic A data', async () => {
    vi.mocked(service.getItems).mockResolvedValueOnce([]);

    const result = await controller.getItems(userClinicB);

    expect(service.getItems).toHaveBeenCalledWith(clinicBId);
    expect(result).toEqual([]);
  });

  it('scopes createItem to the authenticated user clinicId', async () => {
    const dto = {
      name: 'Composite Resin A2',
      sku: 'RES-A2',
      category: 'Restorative Materials',
      unit: 'syringes',
      reorderLevel: 5,
    };

    await controller.createItem(userClinicA, dto);
    expect(service.createItem).toHaveBeenCalledWith(clinicAId, dto);
    expect(service.createItem).not.toHaveBeenCalledWith(clinicBId, dto);
  });

  it('scopes getMovements (deduction audits) strictly to the authenticated clinicId', async () => {
    vi.mocked(service.getAudits).mockResolvedValueOnce([]);

    await controller.getMovements(userClinicB);
    expect(service.getAudits).toHaveBeenCalledWith(clinicBId);
    expect(service.getAudits).not.toHaveBeenCalledWith(clinicAId);
  });

  it('scopes confirmDeduction strictly to the authenticated clinicId', async () => {
    const deductionDto = {
      treatmentId: 'trt-101',
      patientId: 'pat-101',
      doctorId: 'doc-1',
      procedureId: 'proc-1',
      procedureName: 'Composite Restoration',
      materials: [
        { itemId: 'mat-1', batchNumber: 'LOT-1', quantity: 1 },
      ],
    };

    await controller.confirmDeduction(userClinicA, deductionDto as any);
    expect(service.confirmDeduction).toHaveBeenCalledWith(clinicAId, deductionDto, userClinicA);
  });
});

