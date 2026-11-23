import { useEffect, useState } from 'react'
import { apiClient, getStoredToken } from './apiClient'
type Entry = { id: string; name?: string; title?: string; code?: string; category?: string; fee?: string; frequency?: string; duration?: string; instructions?: string; route?: string; complaint?: string; findings?: string; plan?: string }
export function useClinicalCatalogue() {
  const [catalogue, setCatalogue] = useState<{ customMedicines: Entry[]; customProcedures: Entry[]; customDiagnoses: Entry[]; customTemplates: Entry[] }>({ customMedicines: [], customProcedures: [], customDiagnoses: [], customTemplates: [] })
  useEffect(() => {
    if (!getStoredToken()) return
    let mounted = true
    apiClient.get<any>('/clinics/my-clinic/clinical-config').then(result => {
      if (mounted) setCatalogue({ customMedicines: result.customMedicines || [], customProcedures: result.customProcedures || [], customDiagnoses: result.customDiagnoses || [], customTemplates: result.customTemplates || [] })
    }).catch(() => { /* Typed entry remains available when suggestions cannot load. */ })
    return () => { mounted = false }
  }, [])
  return catalogue
}
