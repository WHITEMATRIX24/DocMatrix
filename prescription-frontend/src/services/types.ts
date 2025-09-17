export interface Medicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  whenToUse: string;
  sideEffects?: string;
  category?: string;
  manufacturer?: string;
}

export interface PatientDetails {
  name: string;
  age: number;
  bloodGroup: string;
  weight?: number;
  phone?: string;
  address?: string;
}

export interface PrescribedMedicine {
  name: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  height: string;
  bloodPressure: string;
  pulseRate: string;
  sugarLevelPreMeal: ReactNode;
  weight: string;
  sugarLevelPostMeal: ReactNode;
  temperature: any;
  hasFever: any;
  notes: any;
  prescriptionId?: string;
  doctorId?: string;
  patientDetails: PatientDetails;
  symptoms: string;
  diagnosis?: string;
  medicines: PrescribedMedicine[];
  createdAt?: string;
  status?: string;
}

export interface User {
  userId: string;
  email: string;
  name: string;
  role: 'doctor' | 'staff';
  specialization?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}