import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  addPatientDocument,
  deletePatientDocument,
  getClinicSnapshot,
  resetStoreForTesting,
} from '@/services/clinicStore'

describe('Patient Documents Storage Management', () => {
  beforeEach(() => {
    resetStoreForTesting()
  })

  it('adds a patient document with metadata and contentBase64 payload', async () => {
    const docData = {
      patientId: 'PT-1001',
      title: 'Panoramic Radiograph OPG',
      category: 'Radiology',
      fileName: 'opg_scan.jpg',
      fileSize: '2.4 MB',
      mimeType: 'image/jpeg',
      url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      contentBase64: '/9j/4AAQSkZJRg==',
    }

    const created = addPatientDocument(docData)

    expect(created.id).toBeDefined()
    expect(created.title).toBe('Panoramic Radiograph OPG')
    expect(created.category).toBe('Radiology')
    expect(created.fileSize).toBe('2.4 MB')

    const snapshot = getClinicSnapshot()
    const found = snapshot.patientDocuments.find((d) => d.title === 'Panoramic Radiograph OPG')
    expect(found).toBeDefined()
    expect(found?.patientId).toBe('PT-1001')
  })

  it('deletes patient document cleanly from client store', async () => {
    const docData = {
      patientId: 'PT-1001',
      title: 'Temporary RVG Scan',
      category: 'Radiology',
      fileName: 'rvg_temp.png',
      fileSize: '500 KB',
      mimeType: 'image/png',
      url: 'data:image/png;base64,iVBORw0KGgo==',
    }

    const created = addPatientDocument(docData)
    expect(getClinicSnapshot().patientDocuments.some((d) => d.id === created.id)).toBe(true)

    await deletePatientDocument('PT-1001', created.id)
    expect(getClinicSnapshot().patientDocuments.some((d) => d.id === created.id)).toBe(false)
  })

  it('preserves signedUrl and downloadUrl references on document records', () => {
    const docWithCloudUrls = {
      patientId: 'PT-1002',
      title: 'Signed Surgical Consent',
      category: 'Consent',
      fileName: 'implant_consent.pdf',
      fileSize: '1.1 MB',
      mimeType: 'application/pdf',
      url: 'https://br-young-sun-a1nqh9d8.storage.neon.tech/uploads/consent.pdf?token=abc',
      signedUrl: 'https://br-young-sun-a1nqh9d8.storage.neon.tech/uploads/consent.pdf?token=abc',
      downloadUrl: '/patients/PT-1002/documents/DOC-99/download',
      previewUrl: '/patients/PT-1002/documents/DOC-99/preview',
    }

    const created = addPatientDocument(docWithCloudUrls)
    expect(created.signedUrl).toContain('storage.neon.tech')
    expect(created.downloadUrl).toContain('/patients/PT-1002/documents/')
  })
})
