import { useEffect, useState } from 'react';
import { apiClient } from './apiClient';
import { getActiveClinicId, isAuthenticatedClinic } from './clinicStore';
interface Letterhead { name?: string; address?: string; phone?: string; email?: string }
export function useClinicLetterhead(overrides: Letterhead = {}) {
  const clinicId = getActiveClinicId();
  const authenticated = isAuthenticatedClinic();
  const [record, setRecord] = useState<{ clinicId: string | null; data: Letterhead } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    if (authenticated) apiClient.get<any>('/clinics/my-clinic').then(data => {
      if (!data?.name) throw new Error('Clinic details are unavailable.');
      if (active) setRecord({ clinicId, data: { name: data.displayName || data.name,
        address: [data.address, data.city, data.state, data.postalCode].filter(Boolean).join(', '), phone: data.phone || '', email: data.email || '' } });
    }).catch(() => { if (active) setError('Clinic details could not be loaded. Close and reopen this preview to retry.'); });
    return () => { active = false; };
  }, [clinicId, authenticated]);
  const current = authenticated && record?.clinicId === clinicId ? record.data : null;
  return { name: current?.name || overrides.name || 'Clinic', address: current?.address ?? overrides.address ?? '',
    phone: current?.phone ?? overrides.phone ?? '', email: current?.email ?? overrides.email ?? '',
    ready: !authenticated || !!current, error };
}
