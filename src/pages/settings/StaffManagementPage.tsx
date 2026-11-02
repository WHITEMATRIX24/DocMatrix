import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Shield, Mail, Phone, CheckCircle2, AlertCircle } from 'lucide-react'
import { apiClient } from '@/services/apiClient'

interface StaffMember {
  id: string
  fullName: string
  email: string
  phone?: string
  role: string
  isActive: boolean
  isPrimaryContact?: boolean
  createdAt: string
}

export const StaffManagementPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'DOCTOR'
  })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadStaff = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<StaffMember[]>('/clinics/my-clinic/staff')
      if (Array.isArray(res)) {
        setStaff(res)
      } else {
        setStaff([])
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load clinic staff.' })
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [])

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.fullName || !formData.email || !formData.password) {
      setFeedback({ type: 'error', message: 'Full name, email, and password are required.' })
      return
    }

    try {
      setSubmitting(true)
      setFeedback(null)
      const newStaff = await apiClient.post<StaffMember>('/clinics/my-clinic/staff', formData)
      setStaff((prev) => [newStaff, ...prev])
      setFeedback({ type: 'success', message: `${formData.fullName} added successfully.` })
      setShowAddModal(false)
      setFormData({ fullName: '', email: '', password: '', phone: '', role: 'DOCTOR' })
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add staff member.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0d9488', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
            <Users size={16} />
            <span>CLINICAL TEAM</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#134e4a', margin: '6px 0 8px' }}>
            Staff &amp; Doctor Management
          </h1>
          <p style={{ color: '#4b5563', fontSize: '14px', maxWidth: '640px' }}>
            Manage dental practitioners, operatory chair permissions, receptionists, and role-based access for your clinic.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0d9488',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer'
          }}
        >
          <UserPlus size={16} />
          <span>Add Staff Member</span>
        </button>
      </header>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: feedback.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Staff Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '14px 20px' }}>Staff Member</th>
              <th style={{ padding: '14px 20px' }}>Role</th>
              <th style={{ padding: '14px 20px' }}>Contact</th>
              <th style={{ padding: '14px 20px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>
                    {member.fullName}
                    {member.isPrimaryContact && (
                      <span style={{
                        marginLeft: '8px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontWeight: 600
                      }}>
                        Owner
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: member.role === 'DOCTOR' ? '#ccfbf1' : '#f3f4f6',
                    color: member.role === 'DOCTOR' ? '#0f766e' : '#374151',
                    fontSize: '12px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 600
                  }}>
                    <Shield size={12} />
                    {member.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ color: '#4b5563', fontSize: '13px' }}>{member.email}</div>
                  {member.phone && <div style={{ color: '#9ca3af', fontSize: '12px' }}>{member.phone}</div>}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: member.isActive ? '#10b981' : '#9ca3af',
                    marginRight: '6px'
                  }} />
                  <span style={{ fontSize: '13px', color: member.isActive ? '#065f46' : '#6b7280' }}>
                    {member.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: '0 0 16px' }}>
              Add Clinic Staff Member
            </h2>
            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kavitha Rajan"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Email Address (Login)
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. dr.kavitha@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                  Role &amp; Permissions
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff' }}
                >
                  <option value="DOCTOR">Doctor / Dental Surgeon</option>
                  <option value="RECEPTIONIST">Receptionist / Front Desk</option>
                  <option value="NURSE">Dental Assistant / Nurse</option>
                  <option value="BRANCH_ADMIN">Branch Administrator</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#0d9488',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Adding...' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffManagementPage
