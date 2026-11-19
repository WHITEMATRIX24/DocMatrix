import React, { useState, useEffect, useMemo } from 'react'
import {
  Users, UserPlus, Search, Filter, Shield, MoreVertical,
  CheckCircle2, AlertCircle, Edit2, Trash2, Power, X, RefreshCw,
  User, Mail, Lock, Phone, Eye, EyeOff, Key, Check, Info
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import type { StaffRole } from '@/mocks/auth'
import { cacheClinicStaff, getStaffClinicId } from '@/services/clinicStaffStore'

interface StaffMember {
  id: string
  fullName: string
  email: string
  phone?: string
  role: StaffRole
  isActive: boolean
  isPrimaryContact?: boolean
  createdAt?: string
}

interface AssignableRole { value: StaffRole; label: string }

const ROLE_DESCRIPTIONS: Record<string, { title: string; desc: string }> = {
  ORGANIZATION_ADMIN: {
    title: 'Organization Administrator',
    desc: 'Full administrative control over all clinic branches, subscription plans, and organizational settings.'
  },
  BRANCH_ADMIN: {
    title: 'Branch Administrator',
    desc: 'Full operational control over this clinic branch, staff members, master clinical lists, and settings.'
  },
  DOCTOR: {
    title: 'Dentist / Practitioner',
    desc: 'Full clinical care access: patient records, interactive tooth charts, clinical notes, prescriptions, and treatment plans.'
  },
  DENTIST: {
    title: 'Dentist / Practitioner',
    desc: 'Full clinical care access: patient records, interactive tooth charts, clinical notes, prescriptions, and treatment plans.'
  },
  RECEPTIONIST: {
    title: 'Front Desk & Operations',
    desc: 'Patient intake, appointment booking, check-in, live OPD queue management, and basic patient documents.'
  },
  ACCOUNTANT: {
    title: 'Billing & Financials',
    desc: 'Invoicing, payment collection, expense records, tax reports, and Tally exports.'
  },
  NURSE: {
    title: 'Dental Assistant',
    desc: 'Clinical assistance: view appointments, patient records, and assist with clinical charting.'
  },
  CLINICAL_ASSISTANT: {
    title: 'Dental Assistant',
    desc: 'Clinical assistance: view appointments, patient records, and assist with clinical charting.'
  },
  LAB_TECHNICIAN: {
    title: 'Dental Lab Technician',
    desc: 'Dental lab tracking, prosthetics status updates, and lab order coordination.'
  },
  PHARMACIST: {
    title: 'Clinic Pharmacist',
    desc: 'Medication dispensing, pharmacy inventory, and prescription fulfillment.'
  }
}

export const StaffManagementPage: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [assignableRoles, setAssignableRoles] = useState<AssignableRole[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Add Staff Modal State
  const [showAddModal, setShowAddModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'DOCTOR' as StaffMember['role'],
    password: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    role: 'DOCTOR' as StaffMember['role']
  })

  // Fetch staff list
  const fetchStaff = async () => {
    const clinicId = getStaffClinicId()
    try {
      setLoading(true)
      const [res, roles] = await Promise.all([
        apiClient.get<StaffMember[]>('/clinics/my-clinic/staff'),
        apiClient.get<AssignableRole[]>('/clinics/my-clinic/staff/roles')
      ])
      if (clinicId !== getStaffClinicId()) return
      setAssignableRoles(Array.isArray(roles) ? roles : [])
      if (Array.isArray(res)) {
        setStaff(res)
        cacheClinicStaff(res, clinicId)
      }
    } catch (err: any) {
      setStaff([])
      setAssignableRoles([])
      setFeedback({ type: 'error', message: err?.message || 'Could not load staff management. Please retry.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const closeAddModal = () => {
    setShowAddModal(false)
    setShowPassword(false)
    setFormData({ fullName: '', email: '', phone: '', role: 'DOCTOR', password: '' })
  }

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*'
    let pwd = 'Dm@'
    for (let i = 0; i < 11; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, password: pwd }))
    setShowPassword(true)
  }
  const canManageMember = (member: StaffMember) => assignableRoles.some(r => r.value === member.role)
  const roleFilters = [...new Set(staff.map(s => s.role).concat(assignableRoles.map(r => r.value)))]

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !assignableRoles.some(r => r.value === formData.role)) return
    setSubmitting(true)
    setFeedback(null)

    try {
      const res = await apiClient.post<StaffMember>('/clinics/my-clinic/staff', formData)
      closeAddModal()
      setFeedback({ type: 'success', message: `Staff member "${formData.fullName}" added successfully.` })
      await fetchStaff()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to create staff member. Verify that the email is unique.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (member: StaffMember) => {
    setEditingStaff(member)
    setEditFormData({
      fullName: member.fullName,
      phone: member.phone || '',
      role: member.role
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStaff || submitting || !canManageMember(editingStaff)) return
    setSubmitting(true)
    setFeedback(null)

    try {
      await apiClient.patch(`/clinics/my-clinic/staff/${editingStaff.id}`, editFormData)
      setEditingStaff(null)
      setFeedback({ type: 'success', message: 'Staff member details updated successfully.' })
      await fetchStaff()
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to update staff member.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (member: StaffMember) => {
    if (actionLoadingId || !canManageMember(member)) return
    if (member.isPrimaryContact) {
      setFeedback({ type: 'error', message: 'Cannot deactivate the primary clinic owner account.' })
      return
    }

    try {
      setActionLoadingId(member.id)
      await apiClient.patch(`/clinics/my-clinic/staff/${member.id}`, {
        isActive: !member.isActive
      })
      setFeedback({
        type: 'success',
        message: `Staff member ${member.fullName} marked as ${!member.isActive ? 'Active' : 'Inactive'}.`
      })
      await fetchStaff()
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to change staff active status.' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteStaff = async (member: StaffMember) => {
    if (actionLoadingId || !canManageMember(member)) return
    if (member.isPrimaryContact) {
      setFeedback({ type: 'error', message: 'The primary clinic owner account cannot be deleted.' })
      return
    }

    const confirmDelete = window.confirm(`Are you sure you want to remove ${member.fullName} from your clinic staff?`)
    if (!confirmDelete) return

    try {
      setActionLoadingId(member.id)
      await apiClient.delete(`/clinics/my-clinic/staff/${member.id}`)
      setFeedback({ type: 'success', message: `Access removed for ${member.fullName}. Historical records are retained.` })
      await fetchStaff()
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete staff member.' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      if (selectedRole !== 'ALL' && m.role !== selectedRole) return false
      if (statusFilter === 'ACTIVE' && !m.isActive) return false
      if (statusFilter === 'INACTIVE' && m.isActive) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = m.fullName.toLowerCase().includes(q)
        const matchEmail = m.email.toLowerCase().includes(q)
        const matchPhone = m.phone ? m.phone.toLowerCase().includes(q) : false
        if (!matchName && !matchEmail && !matchPhone) return false
      }

      return true
    })
  }, [staff, searchQuery, selectedRole, statusFilter])

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }} data-testid="feature-page-set.staff">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal-primary, #008891)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <Users size={16} />
            <span>CLINICAL TEAM &amp; PERMISSIONS</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: '4px 0' }}>
            Staff &amp; Practitioner Management
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', margin: 0 }}>
            Manage dental practitioners, receptionists, access privileges, and account active statuses.
          </p>
        </div>

        <button
          type="button"
          disabled={loading || !assignableRoles.length || submitting}
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--teal-primary, #008891)',
            color: '#ffffff',
            padding: '9px 18px',
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
        <div role={feedback.type === 'error' ? 'alert' : 'status'} style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          background: feedback.type === 'success' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
          color: feedback.type === 'success' ? 'var(--tone-green, #065f46)' : 'var(--tone-red, #991b1b)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
          {feedback.type === 'error' && <button type="button" onClick={fetchStaff}>Reload staff</button>}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        background: 'var(--surface-raised, #ffffff)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
          <Search size={16} color="var(--text-muted, #94a3b8)" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '13.5px', background: 'transparent', color: 'var(--text-strong)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Role:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--line-strong, #cbd5e1)',
                fontSize: '13px',
                background: 'var(--surface-sunken, #fff)',
                color: 'var(--text-strong, #0f172a)'
              }}
            >
              <option value="ALL">All Roles ({staff.length})</option>
              {roleFilters.map(role => (
                <option key={role} value={role}>{assignableRoles.find(r => r.value === role)?.label || role.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--line-strong, #cbd5e1)',
                fontSize: '13px',
                background: 'var(--surface-sunken, #fff)',
                color: 'var(--text-strong, #0f172a)'
              }}
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div style={{
        background: 'var(--surface-raised, #ffffff)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ background: 'var(--surface-alt, #f8fafc)', borderBottom: '1px solid var(--line, #e2e8f0)', color: 'var(--text-muted, #64748b)', fontSize: '12px', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 18px' }}>Staff Member</th>
              <th style={{ padding: '12px 18px' }}>Role</th>
              <th style={{ padding: '12px 18px' }}>Contact</th>
              <th style={{ padding: '12px 18px' }}>Status</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-faint, #94a3b8)' }}>
                  {loading ? 'Loading clinic team...' : 'No staff members match the current filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredStaff.map((member) => (
                <tr key={member.id} style={{ borderBottom: '1px solid var(--line, #f1f5f9)', opacity: member.isActive ? 1 : 0.65 }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
                      {member.fullName}
                      {member.isPrimaryContact && (
                        <span style={{
                          marginLeft: '8px',
                          background: 'var(--teal-tint, rgba(0, 136, 145, 0.12))',
                          border: '1px solid var(--teal-border, rgba(0, 136, 145, 0.25))',
                          color: 'var(--teal-primary, #0369a1)',
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
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: member.role === 'DOCTOR' ? 'var(--teal-tint, #f0fdfa)' : 'var(--surface-alt, #f1f5f9)',
                      color: member.role === 'DOCTOR' ? 'var(--teal-primary, #0f766e)' : 'var(--text, #475569)',
                      border: '1px solid var(--line, #e2e8f0)',
                      fontSize: '12px',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontWeight: 600
                    }}>
                      <Shield size={12} />
                      {member.role === 'NURSE' ? 'Dental Assistant' : member.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ color: 'var(--text-strong, #334155)', fontSize: '13px' }}>{member.email}</div>
                    {member.phone && <div style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '12px' }}>{member.phone}</div>}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12.5px',
                      fontWeight: 500,
                      color: member.isActive ? 'var(--tone-green, #065f46)' : 'var(--text-muted, #64748b)'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: member.isActive ? 'var(--tone-green, #10b981)' : 'var(--text-muted, #cbd5e1)'
                      }} />
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        title="Edit details"
                        disabled={!canManageMember(member) || Boolean(actionLoadingId) || submitting}
                        onClick={() => handleStartEdit(member)}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          background: 'var(--surface-sunken, #f8fafc)',
                          border: '1px solid var(--line-strong, #cbd5e1)',
                          color: 'var(--text-strong, #475569)',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={14} />
                      </button>

                      {!member.isPrimaryContact && canManageMember(member) && (
                        <>
                          <button
                            type="button"
                            title={member.isActive ? 'Deactivate staff' : 'Activate staff'}
                            disabled={Boolean(actionLoadingId) || submitting}
                            onClick={() => handleToggleActive(member)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: member.isActive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                              border: `1px solid ${member.isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                              color: member.isActive ? 'var(--tone-amber, #92400e)' : 'var(--tone-green, #065f46)',
                              cursor: 'pointer'
                            }}
                          >
                            <Power size={14} />
                          </button>

                          <button
                            type="button"
                            title="Remove staff member"
                            disabled={Boolean(actionLoadingId) || submitting}
                            onClick={() => handleDeleteStaff(member)}
                            style={{
                              padding: '6px',
                              borderRadius: '6px',
                              background: 'rgba(220, 38, 38, 0.12)',
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                              color: 'var(--tone-red, #b91c1c)',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
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
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '100%',
            padding: '26px 28px',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(0, 136, 145, 0.1)',
                  border: '1px solid rgba(0, 136, 145, 0.2)',
                  color: 'var(--teal-primary, #008891)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <UserPlus size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: 0, letterSpacing: '-0.01em' }}>
                    Add New Staff Member
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                    Set up credentials and assign role permissions for clinic access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={submitting}
                aria-label="Close"
                style={{
                  background: 'var(--surface-alt, #f1f5f9)',
                  border: 'none',
                  color: 'var(--text-muted, #64748b)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form role="dialog" aria-label="Add staff member" onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Kavitha Rajan"
                    aria-label="Full name"
                    maxLength={150}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Email Address (Login) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} />
                  <input
                    type="email"
                    required
                    placeholder="doctor@docmatrix.com"
                    aria-label="Email"
                    autoComplete="off"
                    maxLength={254}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)' }}>
                    Initial Password <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--teal-primary, #008891)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '11.5px',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Key size={12} /> Auto-suggest password
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 12 characters"
                    aria-label="Initial password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={72}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted, #94a3b8)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11.5px' }}>
                  <span style={{ color: formData.password.length >= 12 ? 'var(--tone-green, #059669)' : 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {formData.password.length >= 12 && <Check size={12} strokeWidth={2.6} />}
                    {formData.password.length >= 12 ? 'Password meets minimum length' : 'Minimum 12 characters required'}
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} />
                  <input
                    type="tel"
                    placeholder="+91 98765 00000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Role & Permissions */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Role &amp; Permissions
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Shield size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none', zIndex: 1 }} />
                  <select
                    value={formData.role}
                    aria-label="Staff role"
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 34px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      boxSizing: 'border-box',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {assignableRoles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>

                {ROLE_DESCRIPTIONS[formData.role] && (
                  <div style={{
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 136, 145, 0.05)',
                    border: '1px solid rgba(0, 136, 145, 0.15)',
                    fontSize: '12px',
                    color: 'var(--text, #334155)',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <Info size={14} color="var(--teal-primary, #008891)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong style={{ color: 'var(--teal-primary, #008891)', marginRight: '4px' }}>
                        {ROLE_DESCRIPTIONS[formData.role].title}:
                      </strong>
                      {ROLE_DESCRIPTIONS[formData.role].desc}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--line-strong, #cbd5e1)',
                    background: 'var(--surface-base, #ffffff)',
                    color: 'var(--text-strong, #334155)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !assignableRoles.some(r => r.value === formData.role)}
                  style={{
                    flex: 1.2,
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: submitting || !assignableRoles.some(r => r.value === formData.role)
                      ? 'var(--line-strong, #cbd5e1)'
                      : 'var(--teal-primary, #008891)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 136, 145, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--line, #e2e8f0)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '26px 28px',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.18), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(0, 136, 145, 0.1)',
                  border: '1px solid rgba(0, 136, 145, 0.2)',
                  color: 'var(--teal-primary, #008891)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Edit2 size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: 0, letterSpacing: '-0.01em' }}>
                    Edit Staff Member
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                    Update staff profile details and role assignment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                style={{
                  background: 'var(--surface-alt, #f1f5f9)',
                  border: 'none',
                  color: 'var(--text-muted, #64748b)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form role="dialog" aria-label="Edit staff member" onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    required
                    value={editFormData.fullName}
                    aria-label="Full name"
                    maxLength={150}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none' }} />
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Role & Permissions */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '5px' }}>
                  Role &amp; Permissions
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Shield size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted, #94a3b8)', pointerEvents: 'none', zIndex: 1 }} />
                  <select
                    disabled={editingStaff.isPrimaryContact}
                    aria-label="Staff role"
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 34px 10px 38px',
                      borderRadius: '8px',
                      border: '1px solid var(--line-strong, #cbd5e1)',
                      background: editingStaff.isPrimaryContact ? 'var(--surface-alt, #f1f5f9)' : 'var(--surface-base, #ffffff)',
                      color: 'var(--text-strong, #0f172a)',
                      fontSize: '13.5px',
                      fontWeight: 500,
                      boxSizing: 'border-box',
                      outline: 'none',
                      appearance: 'none',
                      cursor: editingStaff.isPrimaryContact ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {assignableRoles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <div style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'var(--text-muted, #94a3b8)', display: 'flex', alignItems: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
                {editingStaff.isPrimaryContact ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '4px', display: 'block' }}>
                    Owner role cannot be changed.
                  </span>
                ) : ROLE_DESCRIPTIONS[editFormData.role] && (
                  <div style={{
                    marginTop: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 136, 145, 0.05)',
                    border: '1px solid rgba(0, 136, 145, 0.15)',
                    fontSize: '12px',
                    color: 'var(--text, #334155)',
                    lineHeight: 1.4,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <Info size={14} color="var(--teal-primary, #008891)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong style={{ color: 'var(--teal-primary, #008891)', marginRight: '4px' }}>
                        {ROLE_DESCRIPTIONS[editFormData.role].title}:
                      </strong>
                      {ROLE_DESCRIPTIONS[editFormData.role].desc}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--line-strong, #cbd5e1)',
                    background: 'var(--surface-base, #ffffff)',
                    color: 'var(--text-strong, #334155)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1.2,
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: submitting ? 'var(--line-strong, #cbd5e1)' : 'var(--teal-primary, #008891)',
                    color: '#fff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 136, 145, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
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
