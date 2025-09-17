// services/api.ts
const API_BASE_URL = 'https://ich7ycwdq2.execute-api.ap-south-1.amazonaws.com/prod';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  getPrescriptionById: any;
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: this.getAuthHeaders(),
      ...options
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  // Medicine API
  async searchMedicines(query: string, page: number = 1, limit: number = 10) {
    return this.request<{
      medicines: Array<{
        medicineId: string;
        medicineName: string;
        composition: string;
        whenToUse: string;
        sideEffects?: string;
        category?: string;
        manufacturer?: string;
      }>;
      count: number;
    }>(`/medicines/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  }

  // Patient API
  async createPatient(patientData: {
    name: string;
    age: number;
    bloodGroup: string;
    weight: number;
    phone?: string;
    address?: string;
  }) {
    return this.request<{
      patientId: string;
      message: string;
      patient: any;
    }>('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  }

  async searchPatients(searchTerm?: string) {
    const url = searchTerm 
      ? `/patients?search=${encodeURIComponent(searchTerm)}`
      : '/patients';
    return this.request<{
      patients: Array<{
        patientId: string;
        name: string;
        age: number;
        bloodGroup: string;
        weight: number;
        phone?: string;
        address?: string;
      }>;
      count: number;
    }>(url);
  }

  // Prescription API
  async createPrescription(prescriptionData: {
    patientDetails: {
      name: string;
      age: number;
      bloodGroup: string;
      weight: number;
    };
    symptoms: string;
    diagnosis?: string;
    medicines: Array<{
      medicineId: string;
      medicineName: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  }) {
    return this.request<{
      prescriptionId: string;
      message: string;
      prescription: any;
    }>('/prescriptions', {
      method: 'POST',
      body: JSON.stringify(prescriptionData)
    });
  }

  async getPrescription(prescriptionId: string) {
    return this.request<{
      prescription: {
        prescriptionId: string;
        doctorId: string;
        patientDetails: any;
        symptoms: string;
        diagnosis?: string;
        medicines: Array<any>;
        createdAt: string;
        status: string;
      };
    }>(`/prescriptions/${prescriptionId}`);
  }

  async getPatient(patientId: string) {
    return this.request<{
      patient: {
        patientId: string;
        name: string;
        age: number;
        bloodGroup: string;
        weight: number;
        phone?: string;
        address?: string;
      };
    }>(`/patients/${patientId}`);
  }

  async getPatientPrescriptions(patientId: string) {
    return this.request<{
      prescriptions: Array<any>;
      count: number;
      patientId: string;
    }>(`/patient/${patientId}`);
  }

  async printPrescription(prescriptionId: string) {
    const response = await fetch(`${API_BASE_URL}/print?prescriptionId=${prescriptionId}`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate prescription');
    }
    
    return response.text(); // Returns HTML content
  }

  // Auth API (for signup)
  async signup(userData: {
    username: string;
    email: string;
    password: string;
    name: string;
    role?: string;
  }) {
    return this.request<{
      message: string;
      username: string;
      email: string;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }
}

export const apiService = new ApiService();
export default apiService;