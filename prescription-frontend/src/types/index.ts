// src/types/index.ts
// Fixed Medicine interface to handle both complete and partial objects

export type UserRole = 'doctor' | 'staff' | 'admin';

export interface Medicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  manufacturer?: string;
  category?: string;
  whenToUse?: string;
  sideEffects?: string;
  searchableText?: string;
  dosageForm?: string;
  strength?: string;
  price?: number;
  stockQuantity?: number;
  expiryDate?: string;
  isActive?: boolean;
  createdAt?: string;  // ← Made optional
  updatedAt?: string;  // ← Made optional
  createdBy?: string;
}

// Separate interface for complete medicine records (with required timestamps)
export interface CompleteMedicine extends Medicine {
  createdAt: string;
  updatedAt: string;
}

// Enhanced Patient Vitals
export interface PatientVitals {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  height?: number; // in cm
  weight?: number; // in kg
  temperature?: number; // in Celsius (for fever cases)
  sugarLevel?: {
    preMeal?: number; // mg/dL
    postMeal?: number; // mg/dL
    fastingGlucose?: number; // mg/dL
    randomGlucose?: number; // mg/dL
  };
}

export interface Patient {
  patientId: string;
  name: string;
  age: number;
  gender?: string;
  bloodGroup: string;
  weight: number;
  height?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string[];
  allergies?: string[];
  currentMedications?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  lastVisit?: string;
}

export interface PrescriptionMedicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  notes: string;
  prescriptionId: string;
  patientId: string;
  patientDetails: Partial<Patient>;
  doctorId: string;
  doctorName: string;
  symptoms: string;
  diagnosis?: string;
  medicines: PrescriptionMedicine[];
  instructions?: string;
  followUpDate?: string;
  priority: 'normal' | 'urgent' | 'emergency';
  status: 'active' | 'completed' | 'cancelled';
  prescriptionDate: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
  dispensed: boolean;
  dispensedAt?: string | null;
  dispensedBy?: string | null;
  
  // Enhanced patient vitals at time of prescription
  vitals?: PatientVitals;
  
  // Additional medical context
  chiefComplaint?: string;
  presentIllnessHistory?: string;
  physicalExamination?: string;
  labReports?: string[];
  
  // Prescription metadata
  prescriptionVersion?: number;
  lastModifiedBy?: string;
  modificationReason?: string;
}

export interface UserProfile {
  UserId: string; // Primary key matching your schema
  cognitoUsername: string;
  email: string;
  name: string;
  role: UserRole;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  phoneNumber?: string;
  address?: string;
  isActive: boolean;
  lastActive: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalMedicines: number;
  totalPatients: number;
  totalPrescriptions: number;
  totalUsers: number;
  todayPrescriptions: number;
  pendingPrescriptions: number;
  lowStockMedicines: number;
  lowStockList: Medicine[];
  recentPatients: Patient[];
  recentPrescriptions: Prescription[];
  recentMedicines: Medicine[];
}

// Create data interfaces
export interface CreateMedicineData {
  medicineName: string;
  composition: string;
  manufacturer?: string;
  category?: string;
  dosageForm?: string;
  strength?: string;
  whenToUse?: string;
  sideEffects?: string;
  price?: number;
  stockQuantity?: number;
  expiryDate?: string;
  createdBy?: string;
}

export interface CreatePatientData {
  name: string;
  age: number;
  gender?: string;
  bloodGroup: string;
  weight: number;
  height?: number;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory?: string[];
  allergies?: string[];
  currentMedications?: string[];
  createdBy?: string;
}

export interface CreatePrescriptionData {
  patientId: string;
  patientDetails: Partial<Patient>;
  doctorId: string;
  doctorName: string;
  symptoms: string;
  diagnosis?: string;
  medicines: PrescriptionMedicine[];
  instructions?: string;
  followUpDate?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  validUntil?: string;
  vitals?: PatientVitals;
  chiefComplaint?: string;
  presentIllnessHistory?: string;
  physicalExamination?: string;
  notes?: string;
}

export interface UpdatePrescriptionData {
  symptoms?: string;
  diagnosis?: string;
  medicines?: PrescriptionMedicine[];
  instructions?: string;
  followUpDate?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  validUntil?: string;
  vitals?: PatientVitals;
  chiefComplaint?: string;
  presentIllnessHistory?: string;
  physicalExamination?: string;
  notes?: string;
  status?: 'active' | 'completed' | 'cancelled';
  modificationReason?: string;
  lastModifiedBy?: string;
}

export interface CreateUserData {
  cognitoUsername: string;
  email: string;
  name: string;
  role?: UserRole;
  specialization?: string;
  licenseNumber?: string;
  department?: string;
  phoneNumber?: string;
  address?: string;
}

// Permission types
export interface UserPermissions {
  canCreatePrescriptions: boolean;
  canViewAllPatients: boolean;
  canEditPatients: boolean;
  canDeletePrescriptions: boolean;
  canEditPrescriptions: boolean;
  canAccessReports: boolean;
  canManageUsers: boolean;
  canViewAuditLogs: boolean;
  canExportData: boolean;
  canManageMedicines: boolean;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}

// Search and filter types
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Default permissions by role
export const getDefaultPermissions = (role: UserRole): UserPermissions => {
  switch (role) {
    case 'doctor':
      return {
        canCreatePrescriptions: true,
        canViewAllPatients: true,
        canEditPatients: true,
        canDeletePrescriptions: false,
        canEditPrescriptions: true,
        canAccessReports: true,
        canManageUsers: false,
        canViewAuditLogs: false,
        canExportData: true,
        canManageMedicines: false,
      };
    case 'admin':
      return {
        canCreatePrescriptions: true,
        canViewAllPatients: true,
        canEditPatients: true,
        canDeletePrescriptions: true,
        canEditPrescriptions: true,
        canAccessReports: true,
        canManageUsers: true,
        canViewAuditLogs: true,
        canExportData: true,
        canManageMedicines: true,
      };
    case 'staff':
      return {
        canCreatePrescriptions: false,
        canViewAllPatients: true,
        canEditPatients: true,
        canDeletePrescriptions: false,
        canEditPrescriptions: false,
        canAccessReports: false,
        canManageUsers: false,
        canViewAuditLogs: false,
        canExportData: false,
        canManageMedicines: true,
      };
    default:
      return {
        canCreatePrescriptions: false,
        canViewAllPatients: false,
        canEditPatients: false,
        canDeletePrescriptions: false,
        canEditPrescriptions: false,
        canAccessReports: false,
        canManageUsers: false,
        canViewAuditLogs: false,
        canExportData: false,
        canManageMedicines: false,
      };
  }
};

// Utility functions for vitals
export const formatBloodPressure = (systolic?: number, diastolic?: number): string => {
  if (!systolic || !diastolic) return 'Not recorded';
  return `${systolic}/${diastolic} mmHg`;
};

export const getBloodPressureCategory = (systolic?: number, diastolic?: number): string => {
  if (!systolic || !diastolic) return 'Unknown';
  
  if (systolic < 120 && diastolic < 80) return 'Normal';
  if (systolic < 130 && diastolic < 80) return 'Elevated';
  if (systolic < 140 || diastolic < 90) return 'High Blood Pressure Stage 1';
  if (systolic < 180 || diastolic < 120) return 'High Blood Pressure Stage 2';
  return 'Hypertensive Crisis';
};

export const formatTemperature = (temp?: number, unit: 'C' | 'F' = 'F'): string => {
  if (!temp) return 'Not recorded';
  return `${temp}°${unit}`;
};

export const getTemperatureCategory = (temp?: number): string => {
  if (!temp) return 'Unknown';
  
  // Assuming Fahrenheit
  if (temp < 97.0) return 'Low';
  if (temp <= 99.3) return 'Normal';
  if (temp <= 100.4) return 'Low-grade fever';
  if (temp <= 102.2) return 'Moderate fever';
  return 'High fever';
};

export const formatSugarLevel = (level?: number): string => {
  if (!level) return 'Not recorded';
  return `${level} mg/dL`;
};

export const getSugarLevelCategory = (level?: number, type: 'fasting' | 'random' | 'postMeal' = 'random'): string => {
  if (!level) return 'Unknown';
  
  switch (type) {
    case 'fasting':
      if (level < 100) return 'Normal';
      if (level < 126) return 'Prediabetes';
      return 'Diabetes';
    case 'postMeal':
      if (level < 140) return 'Normal';
      if (level < 200) return 'Prediabetes';
      return 'Diabetes';
    case 'random':
    default:
      if (level < 140) return 'Normal';
      if (level < 200) return 'Prediabetes';
      return 'Diabetes';
  }
};