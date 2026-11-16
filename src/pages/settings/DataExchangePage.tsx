import React, { useState, useRef } from 'react'
import {
  ArrowDownToLine, ArrowUpFromLine, FileSpreadsheet, Download,
  UploadCloud, CheckCircle2, AlertCircle, FileText, RefreshCw, AlertTriangle
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'

interface ParsedPatientRow {
  firstName: string
  lastName: string
  mobile: string
  email?: string
  gender?: string
  age?: string
  city?: string
  isDuplicate?: boolean
  error?: string
}

export const DataExchangePage: React.FC = () => {
  const [exportingPatients, setExportingPatients] = useState(false)
  const [exportingFullBackup, setExportingFullBackup] = useState(false)
  const [exportFeedback, setExportFeedback] = useState<string | null>(null)

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedPatientRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errorDetails?: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Export Patients CSV
  const handleExportPatients = async () => {
    try {
      setExportingPatients(true)
      setExportFeedback(null)

      let patients: any[] = []
      try {
        const res = await apiClient.get<any[]>('/patients')
        if (Array.isArray(res) && res.length > 0) {
          patients = res
        }
      } catch {}

      if (patients.length === 0) {
        try {
          const cached = localStorage.getItem('docmatrix_patients')
          if (cached) patients = JSON.parse(cached)
        } catch {}
      }

      if (!patients || patients.length === 0) {
        setExportFeedback('No patient records found in your clinic to export.')
        return
      }

      const headers = ['Patient ID', 'First Name', 'Last Name', 'Mobile', 'Email', 'Gender', 'Age', 'City', 'Created Date']
      const rows = patients.map((p) => [
        `"${p.id || p.patientCode || ''}"`,
        `"${p.firstName || ''}"`,
        `"${p.lastName || ''}"`,
        `"${p.mobile || ''}"`,
        `"${p.email || ''}"`,
        `"${p.gender || ''}"`,
        `"${p.age || ''}"`,
        `"${p.city || ''}"`,
        `"${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}"`
      ])

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `docmatrix_patients_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportFeedback(`Successfully exported ${patients.length} patient records to CSV.`)
    } catch (err: any) {
      setExportFeedback(err?.message || 'Failed to export patient records.')
    } finally {
      setExportingPatients(false)
    }
  }

  // 2. Export Full Clinic Backup JSON
  const handleExportFullBackup = async () => {
    try {
      setExportingFullBackup(true)
      setExportFeedback(null)

      const [clinic, staff, patients, inventory] = await Promise.all([
        apiClient.get('/clinics/my-clinic').catch(() => null),
        apiClient.get('/clinics/my-clinic/staff').catch(() => []),
        apiClient.get('/patients').catch(() => []),
        apiClient.get('/inventory/items').catch(() => [])
      ])

      const backupPackage = {
        docMatrixVersion: '2.0.0',
        exportedAt: new Date().toISOString(),
        clinicProfile: clinic,
        staffCount: staff?.length || 0,
        staff: staff,
        patientCount: patients?.length || 0,
        patients: patients,
        inventoryCount: inventory?.length || 0,
        inventory: inventory
      }

      const blob = new Blob([JSON.stringify(backupPackage, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `docmatrix_full_backup_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportFeedback('Full clinic archive backup generated and downloaded successfully.')
    } catch (err: any) {
      setExportFeedback(err?.message || 'Failed to generate full clinic archive.')
    } finally {
      setExportingFullBackup(false)
    }
  }

  // 3. Download Sample CSV Template
  const handleDownloadSampleTemplate = () => {
    const sampleHeaders = ['First Name', 'Last Name', 'Mobile', 'Email', 'Gender', 'Age', 'City']
    const sampleRows = [
      ['Aarav', 'Sharma', '+91 98765 11111', 'aarav.sharma@example.com', 'Male', '32', 'Bengaluru'],
      ['Deepika', 'Patel', '+91 98765 22222', 'deepika.p@example.com', 'Female', '28', 'Mumbai'],
      ['Rohan', 'Iyer', '+91 98765 33333', 'rohan.iyer@example.com', 'Male', '45', 'Chennai']
    ]

    const csv = [sampleHeaders.join(','), ...sampleRows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'docmatrix_patient_import_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 4. Handle File Select & CSV Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setParseError(null)
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string
        if (!text) throw new Error('File appears to be empty.')

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0)
        if (lines.length < 2) {
          throw new Error('CSV must contain a header row and at least one patient record.')
        }

        const rawHeaders = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase())
        const fnIdx = rawHeaders.findIndex(h => h.includes('first') || h.includes('name'))
        const lnIdx = rawHeaders.findIndex(h => h.includes('last'))
        const mobIdx = rawHeaders.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('contact'))
        const emailIdx = rawHeaders.findIndex(h => h.includes('email'))
        const genIdx = rawHeaders.findIndex(h => h.includes('gender'))
        const ageIdx = rawHeaders.findIndex(h => h.includes('age'))
        const cityIdx = rawHeaders.findIndex(h => h.includes('city'))

        if (fnIdx === -1 && mobIdx === -1) {
          throw new Error('Could not identify "First Name" or "Mobile" columns. Please use the template.')
        }

        const rows: ParsedPatientRow[] = []
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim())
          const fn = fnIdx >= 0 ? cells[fnIdx] : cells[0]
          const ln = lnIdx >= 0 ? cells[lnIdx] : ''
          const mob = mobIdx >= 0 ? cells[mobIdx] : ''
          const em = emailIdx >= 0 ? cells[emailIdx] : ''
          const gen = genIdx >= 0 ? cells[genIdx] : 'Other'
          const age = ageIdx >= 0 ? cells[ageIdx] : ''
          const city = cityIdx >= 0 ? cells[cityIdx] : ''

          if (!fn && !mob) continue

          rows.push({
            firstName: fn || 'Unknown',
            lastName: ln,
            mobile: mob,
            email: em,
            gender: gen,
            age: age,
            city: city,
            isDuplicate: false
          })
        }

        setParsedRows(rows)
      } catch (err: any) {
        setParseError(err?.message || 'Failed to parse CSV file.')
        setParsedRows([])
      }
    }
    reader.readAsText(file)
  }

  // 5. Execute Batch Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return

    try {
      setImporting(true)
      let importedCount = 0
      let skippedCount = 0
      const errors: string[] = []

      // Fetch existing patients to detect duplicates before calling API
      const existingPatients = await apiClient.get<any[]>('/patients').catch(() => [])
      const existingMobiles = new Set(
        Array.isArray(existingPatients)
          ? existingPatients.map((p: any) => (p.mobile || '').replace(/\D/g, '')).filter(Boolean)
          : []
      )

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i]
        const cleanMobile = (row.mobile || '').replace(/\D/g, '')

        if (!row.firstName || !row.mobile) {
          skippedCount++
          errors.push(`Row ${i + 1} (${row.firstName || 'Unnamed'}): Missing required first name or mobile number.`)
          continue
        }

        if (cleanMobile.length < 10) {
          skippedCount++
          errors.push(`Row ${i + 1} (${row.firstName}): Mobile number must be at least 10 digits.`)
          continue
        }

        if (existingMobiles.has(cleanMobile)) {
          skippedCount++
          errors.push(`Row ${i + 1} (${row.firstName} ${row.lastName}): Patient with mobile ${row.mobile} already exists.`)
          continue
        }

        // Calculate a valid date of birth from age or default to 30 years ago
        const parsedAge = row.age ? parseInt(row.age, 10) : 30
        const validAge = !isNaN(parsedAge) && parsedAge > 0 && parsedAge < 120 ? parsedAge : 30
        const birthYear = new Date().getFullYear() - validAge
        const dateOfBirth = `${birthYear}-01-01`

        // Format gender into valid Gender enum
        const genLower = (row.gender || '').toLowerCase()
        const gender = genLower.includes('fem') ? 'FEMALE' : genLower.includes('mal') ? 'MALE' : 'OTHER'

        try {
          const payload = {
            firstName: row.firstName.trim(),
            lastName: row.lastName?.trim() || '',
            mobile: row.mobile.trim(),
            email: row.email?.trim() || undefined,
            gender,
            city: row.city?.trim() || undefined,
            dateOfBirth,
          }

          const created = await apiClient.post('/patients', payload)
          if (created && (created as any).id) {
            importedCount++
            existingMobiles.add(cleanMobile)
          } else {
            skippedCount++
            errors.push(`Row ${i + 1} (${row.firstName}): Could not persist to database.`)
          }
        } catch (err: any) {
          skippedCount++
          errors.push(`Row ${i + 1} (${row.firstName}): ${err?.message || 'Server rejected record'}`)
        }
      }

      setImportResult({ imported: importedCount, skipped: skippedCount, errorDetails: errors })
      setParsedRows([])
      setImportFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setImporting(false)
    }
  }

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }} data-testid="feature-page-set.data">
      {/* Header */}
      <header style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--teal-primary, #008891)', textTransform: 'uppercase' }}>
          CLINIC SETTINGS &amp; ADMINISTRATION
        </span>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0', color: 'var(--text-strong, #0f172a)' }}>
          Data Export &amp; Batch Import
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
          Export clinic patient registries, download full system backups, or batch import existing patients from spreadsheet CSVs.
        </p>
      </header>

      {exportFeedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          background: 'rgba(5, 150, 105, 0.12)',
          border: '1px solid rgba(5, 150, 105, 0.3)',
          color: 'var(--tone-green, #059669)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} />
          <span>{exportFeedback}</span>
        </div>
      )}

      {/* Grid: Export on Left, Import on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Export Column */}
        <div>
          <div style={{
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <ArrowDownToLine size={20} color="var(--teal-primary, #008891)" />
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
                Export Clinic Records
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Option 1: Patients CSV */}
              <div style={{ border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '16px', background: 'var(--surface-alt, #f8fafc)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileSpreadsheet size={16} color="var(--teal-primary, #008891)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: 0 }}>
                    Patient Registry (CSV)
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Export all active patient demographic profiles, contact phone numbers, emails, and registration dates in standard CSV spreadsheet format.
                </p>
                <button
                  type="button"
                  disabled={exportingPatients}
                  onClick={handleExportPatients}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'var(--teal-primary, #008891)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '13px',
                    border: 'none',
                    cursor: exportingPatients ? 'wait' : 'pointer'
                  }}
                >
                  {exportingPatients ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  {exportingPatients ? 'Exporting...' : 'Export Patients (.CSV)'}
                </button>
              </div>

              {/* Option 2: Full System Backup JSON */}
              <div style={{ border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '16px', background: 'var(--surface-alt, #f8fafc)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileText size={16} color="var(--teal-primary, #008891)" />
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: 0 }}>
                    Full Clinic Backup (JSON)
                  </h3>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                  Complete structured dump including clinic profile, staff list, inventory supplies, and patient records for archival or data portability.
                </p>
                <button
                  type="button"
                  disabled={exportingFullBackup}
                  onClick={handleExportFullBackup}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'var(--surface-sunken, #ffffff)',
                    color: 'var(--text-strong, #334155)',
                    border: '1px solid var(--line-strong, #cbd5e1)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: exportingFullBackup ? 'wait' : 'pointer'
                  }}
                >
                  {exportingFullBackup ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  {exportingFullBackup ? 'Archiving...' : 'Download Full Archive (.JSON)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Import Column */}
        <div>
          <div style={{
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ArrowUpFromLine size={20} color="var(--teal-primary, #008891)" />
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
                  Import Patients from CSV
                </h2>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--teal-primary, #008891)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Download size={13} /> Sample Template
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Upload a comma-separated values (.csv) file containing your existing patient list. Columns should include First Name, Mobile, Email, Gender, and City.
            </p>

            {parseError && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'rgba(220, 38, 38, 0.12)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: 'var(--tone-red, #dc2626)',
                fontSize: '13px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={15} />
                <span>{parseError}</span>
              </div>
            )}

            {importResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: importResult.imported > 0 ? 'rgba(5, 150, 105, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: `1px solid ${importResult.imported > 0 ? 'rgba(5, 150, 105, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                color: importResult.imported > 0 ? 'var(--tone-green, #059669)' : 'var(--tone-red, #dc2626)',
                fontSize: '13.5px',
                marginBottom: '16px'
              }}>
                <strong>Import Result:</strong> {importResult.imported} patient records successfully added to your clinic roster. {importResult.skipped > 0 && `(${importResult.skipped} skipped).`}
                {importResult.errorDetails && importResult.errorDetails.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', maxHeight: '100px', overflowY: 'auto' }}>
                    {importResult.errorDetails.map((err, idx) => (
                      <div key={idx} style={{ marginTop: '2px' }}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* File Dropzone */}
            <div style={{
              border: '2px dashed var(--line-strong, #cbd5e1)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              background: 'var(--surface-alt, #f8fafc)',
              cursor: 'pointer',
              marginBottom: '16px'
            }} onClick={() => fileInputRef.current?.click()}>
              <UploadCloud size={32} color="var(--teal-primary, #008891)" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
                {importFile ? importFile.name : 'Click to select patient CSV file'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                Maximum file size 5MB (.csv only)
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* Parsed Preview Table */}
            {parsedRows.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)' }}>
                    Preview ({parsedRows.length} records ready to import)
                  </span>
                </div>

                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  border: '1px solid var(--line, #e2e8f0)',
                  borderRadius: '6px',
                  marginBottom: '14px',
                  background: 'var(--surface-raised, #ffffff)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-alt, #f1f5f9)', color: 'var(--text-muted, #475569)' }}>
                        <th style={{ padding: '6px 10px' }}>Name</th>
                        <th style={{ padding: '6px 10px' }}>Phone</th>
                        <th style={{ padding: '6px 10px' }}>City</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 10).map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                          <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--text-strong)' }}>{r.firstName} {r.lastName}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--text-muted, #64748b)' }}>{r.mobile || 'N/A'}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--text-muted, #64748b)' }}>{r.city || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  disabled={importing}
                  onClick={handleExecuteImport}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--teal-primary, #008891)',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '14px',
                    border: 'none',
                    cursor: importing ? 'wait' : 'pointer'
                  }}
                >
                  {importing ? 'Importing Patients into Clinic...' : `Import ${parsedRows.length} Patients`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataExchangePage
