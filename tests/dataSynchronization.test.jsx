import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import {
  syncWithBackend,
  retrySync,
  initClinicSession,
  clearClinicStore,
  getClinicSnapshot,
  getSyncStatus,
  isDemoSession,
  isAuthenticatedClinic,
  resetStoreForTesting,
  getStorageKey
} from '@/services/clinicStore';
import { login, logout, STORAGE_KEYS } from '@/services/authService';
import StaffPortal from '@/StaffPortal';

describe('DocMatrix — Frontend-to-Neon Data Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    clearClinicStore();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    clearClinicStore();
  });

  // TEST 1: Automatic sync on authentication
  it('Test 1: triggers synchronization on authenticated clinic session and updates store with backend records', async () => {
    const mockUser = {
      id: 'usr-auth-001',
      name: 'Dr. Sarah Connor',
      email: 'sarah.connor@identclinic.com',
      role: 'ORGANIZATION_ADMIN',
      clinicName: 'Ident Dental Clinic',
      clinicId: 'clinic-ident-777',
    };
    const mockToken = 'jwt-ident-clinic-token-xyz';

    sessionStorage.setItem(STORAGE_KEYS.TOKEN, mockToken);
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    expect(isDemoSession()).toBe(false);
    expect(isAuthenticatedClinic()).toBe(true);

    const mockPatients = [
      {
        id: 'pt-db-001',
        patientCode: 'PAT-7001',
        firstName: 'Elena',
        lastName: 'Rostova',
        age: '29',
        mobile: '9876543210',
        medicalSafetyAlerts: { allergies: 'Penicillin' },
      },
    ];

    const mockPlans = {
      items: [
        {
          id: 'plan-db-001',
          planNumber: 'TP-2026-001',
          patientId: 'PAT-7001',
          title: 'Full Ceramic Bridge',
          totalEstimatedCost: 15000,
          status: 'ACCEPTED',
          stages: [],
          estimateRevisions: [],
        },
      ],
    };

    const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/patients')) return mockPatients;
      if (url.includes('/treatment-plans')) return mockPlans;
      if (url.includes('/appointments')) return [];
      if (url.includes('/clinical-notes')) return [];
      if (url.includes('/prescriptions')) return [];
      return [];
    });

    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    expect(getSpy).toHaveBeenCalledWith('/patients?includeArchived=true');
    expect(getSpy).toHaveBeenCalledWith('/treatment-plans');

    const snapshot = getClinicSnapshot();
    expect(snapshot.syncStatus).toBe('SYNCHRONIZED');
    expect(snapshot.syncError).toBeNull();
    expect(snapshot.patients).toHaveLength(1);
    expect(snapshot.patients[0].firstName).toBe('Elena');
    expect(snapshot.patients[0].id).toBe('PAT-7001');
    expect(snapshot.treatmentPlans).toHaveLength(1);
    expect(snapshot.treatmentPlans[0].title).toBe('Full Ceramic Bridge');
  });

  // TEST 2: Authoritative backend replacement
  it('Test 2: authoritative backend replacement sets empty array when database table has zero records', async () => {
    const mockUser = {
      id: 'usr-new-002',
      name: 'Dr. James Miller',
      email: 'james.miller@emptyclinic.com',
      role: 'ORGANIZATION_ADMIN',
      clinicName: 'Empty Dental Center',
      clinicId: 'clinic-empty-888',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-empty-clinic-token');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    vi.spyOn(apiClient, 'get').mockImplementation(async () => []);

    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    const snapshot = getClinicSnapshot();
    expect(snapshot.syncStatus).toBe('SYNCHRONIZED');
    // Must be completely empty, never populated with mock or demo initialPatients
    expect(snapshot.patients).toEqual([]);
    expect(snapshot.treatmentPlans).toEqual([]);
    expect(snapshot.appointments).toEqual([]);
    expect(snapshot.clinicalNotes).toEqual([]);
    expect(snapshot.prescriptions).toEqual([]);
  });

  // TEST 3: Multi-tenant clinic data isolation
  it('Test 3: enforces multi-tenant isolation so Clinic A records are never visible in Clinic B', async () => {
    // 1. Clinic A session
    const clinicA = {
      id: 'usr-a',
      email: 'admin@clinica.com',
      clinicId: 'clinic-alpha-111',
      clinicName: 'Clinic Alpha',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-clinic-a');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(clinicA));

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/patients')) {
        return [{ id: 'pt-a1', patientCode: 'PAT-A1', firstName: 'AlphaPatient' }];
      }
      return [];
    });

    initClinicSession(clinicA.clinicId);
    await syncWithBackend();

    expect(getStorageKey()).toBe('docmatrix_clinic_data_clinic-alpha-111');
    expect(getClinicSnapshot().patients).toHaveLength(1);
    expect(getClinicSnapshot().patients[0].firstName).toBe('AlphaPatient');

    // 2. Switch to Clinic B session
    const clinicB = {
      id: 'usr-b',
      email: 'admin@clinicb.com',
      clinicId: 'clinic-beta-222',
      clinicName: 'Clinic Beta',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-clinic-b');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(clinicB));

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/patients')) {
        return [{ id: 'pt-b1', patientCode: 'PAT-B1', firstName: 'BetaPatient' }];
      }
      return [];
    });

    initClinicSession(clinicB.clinicId);
    await syncWithBackend();

    expect(getStorageKey()).toBe('docmatrix_clinic_data_clinic-beta-222');
    expect(getClinicSnapshot().patients).toHaveLength(1);
    expect(getClinicSnapshot().patients[0].firstName).toBe('BetaPatient');
    // Clinic A's patient is not in Clinic B's snapshot
    expect(getClinicSnapshot().patients.some((p) => p.firstName === 'AlphaPatient')).toBe(false);
  });

  // TEST 4: Demo mode preservation
  it('Test 4: preserves demo mode, never calls backend endpoints, and preserves demo initial records', async () => {
    // Clear storage to simulate default unauthenticated / demo state
    resetStoreForTesting();
    expect(isDemoSession()).toBe(true);
    expect(isAuthenticatedClinic()).toBe(false);

    const apiSpy = vi.spyOn(apiClient, 'get');

    await syncWithBackend();

    // Must NOT call backend API
    expect(apiSpy).not.toHaveBeenCalled();

    const snapshot = getClinicSnapshot();
    expect(snapshot.syncStatus).toBe('SYNCHRONIZED');
    // Demo patients preserved
    expect(snapshot.patients.length).toBeGreaterThan(0);
    expect(snapshot.patients.some((p) => p.firstName === 'Meera')).toBe(true);
  });

  // TEST 5: In-flight cancellation / race condition prevention
  it('Test 5: cancels slow in-flight request when switching clinics and prevents stale overwrite', async () => {
    // Start with Clinic A
    const clinicA = {
      id: 'usr-a',
      email: 'admin@clinica.com',
      clinicId: 'clinic-slow-a',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-slow-a');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(clinicA));

    let resolveSlowClinicA;
    const slowClinicAPromise = new Promise((resolve) => {
      resolveSlowClinicA = resolve;
    });

    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (url.includes('/patients')) {
        await slowClinicAPromise;
        return [{ id: 'pt-slow-a', patientCode: 'SLOW-A', firstName: 'StaleSlowA' }];
      }
      return [];
    });

    initClinicSession(clinicA.clinicId);
    // Dispatch in-flight sync without awaiting
    const slowSync = syncWithBackend();

    // Immediately switch session to Clinic B before Clinic A resolves
    const clinicB = {
      id: 'usr-b',
      email: 'admin@clinicb.com',
      clinicId: 'clinic-fast-b',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-fast-b');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(clinicB));

    initClinicSession(clinicB.clinicId);

    // Resolve Clinic A's stale delayed response
    resolveSlowClinicA([
      { id: 'pt-slow-a', patientCode: 'SLOW-A', firstName: 'StaleSlowA' },
    ]);
    await slowSync;

    // Clinic B's store must NOT have been overwritten by Clinic A's response
    const snapshot = getClinicSnapshot();
    expect(snapshot.patients.some((p) => p.firstName === 'StaleSlowA')).toBe(false);
  });

  // TEST 6: Network failure and retry handling
  it('Test 6: transitions syncStatus to FAILED on network failure and allows retrySync() to succeed', async () => {
    const mockUser = {
      id: 'usr-retry-1',
      email: 'doctor@nettest.com',
      clinicId: 'clinic-net-123',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-retry-token');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    let failNetwork = true;
    vi.spyOn(apiClient, 'get').mockImplementation(async (url) => {
      if (failNetwork) {
        throw new Error('Network connection timeout');
      }
      if (url.includes('/patients')) {
        return [{ id: 'pt-retry-ok', patientCode: 'PAT-OK', firstName: 'RecoveredPatient' }];
      }
      return [];
    });

    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    let status = getSyncStatus();
    expect(status.status).toBe('FAILED');
    expect(status.error).toContain('Network connection timeout');

    // Second attempt (retry) succeeds
    failNetwork = false;
    await retrySync();

    status = getSyncStatus();
    expect(status.status).toBe('SYNCHRONIZED');
    expect(status.error).toBeNull();
    expect(getClinicSnapshot().patients).toHaveLength(1);
    expect(getClinicSnapshot().patients[0].firstName).toBe('RecoveredPatient');
  });

  // TEST 7: 401 Unauthorized / expired session handling
  it('Test 7: transitions syncStatus to AUTH_EXPIRED when backend responds with 401 Unauthorized', async () => {
    const mockUser = {
      id: 'usr-expired-1',
      email: 'doctor@expired.com',
      clinicId: 'clinic-expired-999',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'expired-jwt-token');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    const authError = new Error('API request failed with status 401');
    authError.status = 401;

    vi.spyOn(apiClient, 'get').mockRejectedValue(authError);

    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    const status = getSyncStatus();
    expect(status.status).toBe('AUTH_EXPIRED');
    expect(status.error).toContain('session expired');
  });

  // TEST 8: Logout cleans store and aborts pending sync
  it('Test 8: logout clears all clinic data and aborts running requests', async () => {
    const mockUser = {
      id: 'usr-logout-test',
      email: 'doctor@logout.com',
      clinicId: 'clinic-logout-001',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-logout');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    vi.spyOn(apiClient, 'get').mockResolvedValue([
      { id: 'pt-1', patientCode: 'PT-1', firstName: 'TemporaryPatient' },
    ]);

    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    expect(getClinicSnapshot().patients).toHaveLength(1);

    // Call logout
    logout();

    expect(sessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();

    const snapshot = getClinicSnapshot();
    expect(snapshot.patients).toEqual([]);
    expect(snapshot.appointments).toEqual([]);
    expect(snapshot.clinicalNotes).toEqual([]);
    expect(snapshot.treatmentPlans).toEqual([]);
    expect(snapshot.syncStatus).toBe('IDLE');
  });

  // TEST 9: Non-interference with Billing and Inventory
  it('Test 9: clinical sync strictly leaves Billing invoices and Inventory untouched', async () => {
    const mockUser = {
      id: 'usr-non-interference',
      email: 'doctor@isolation.com',
      clinicId: 'clinic-iso-001',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-iso');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    // Seed local invoice data
    const localInvoicesKey = 'docmatrix_invoices';
    const mockInvoiceData = [{ id: 'inv-local-001', patientName: 'John Doe', total: 2500 }];
    localStorage.setItem(localInvoicesKey, JSON.stringify(mockInvoiceData));

    // Seed local inventory data
    const localInventoryKey = 'docmatrix_inventory';
    const mockInventoryData = [{ id: 'item-001', itemName: 'Dental Composite A2', stock: 15 }];
    localStorage.setItem(localInventoryKey, JSON.stringify(mockInventoryData));

    vi.spyOn(apiClient, 'get').mockResolvedValue([]);

    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    // Verify Billing and Inventory local storage records remain intact and identical
    expect(JSON.parse(localStorage.getItem(localInvoicesKey) || '[]')).toEqual(mockInvoiceData);
    expect(JSON.parse(localStorage.getItem(localInventoryKey) || '[]')).toEqual(mockInventoryData);
  });

  // TEST 10: UI Sync Indicator in StaffPortal
  it('Test 10: renders correct UI sync badge in StaffPortal topbar', async () => {
    // 1. Render in demo mode
    resetStoreForTesting();
    const { unmount } = render(
      <MemoryRouter>
        <StaffPortal
          user={{
            id: 'usr-104',
            name: 'Dr. Arun Kumar',
            role: 'DOCTOR',
            clinicName: 'DocMatrix Dental Clinic',
            clinicId: 'clinic-demo-001',
          }}
        />
      </MemoryRouter>
    );

    const indicator = screen.getByTestId('sync-status-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent(/Demo Mode/i);
    unmount();

    // 2. Render in authenticated synced state
    const mockUser = {
      id: 'usr-portal-test',
      name: 'Dr. Portal Test',
      email: 'test@portalclinic.com',
      role: 'ORGANIZATION_ADMIN',
      clinicName: 'Portal Test Clinic',
      clinicId: 'clinic-portal-999',
    };
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'jwt-portal-token');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

    vi.spyOn(apiClient, 'get').mockResolvedValue([]);
    initClinicSession(mockUser.clinicId);
    await syncWithBackend();

    render(
      <MemoryRouter>
        <StaffPortal user={mockUser} />
      </MemoryRouter>
    );

    const syncedIndicator = screen.getByTestId('sync-status-indicator');
    expect(syncedIndicator).toBeInTheDocument();
    expect(syncedIndicator).toHaveTextContent(/Synced/i);
  });
});
