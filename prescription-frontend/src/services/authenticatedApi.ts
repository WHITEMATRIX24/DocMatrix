// src/services/authenticatedApi.ts
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

const API_BASE_URL = 'https://ich7ycwdq2.execute-api.ap-south-1.amazonaws.com/prod';

class AuthenticatedApiService {
  private async getAuthToken(): Promise<string> {
    try {
      // First check if user is authenticated
      const currentUser = await getCurrentUser();
      console.log('🔐 Current user:', currentUser.username);
      
      // Method 1: Get ID token from localStorage (fastest)
      console.log('🔄 Getting ID token from localStorage...');
      const idToken = localStorage.getItem('CognitoIdentityServiceProvider.5sjuf1atk9mi8ufregrsgskkdu.parool.10bng_1753447053426.idToken');
      
      if (idToken) {
        // Validate token is not expired
        try {
          const payload = JSON.parse(atob(idToken.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          
          if (!isExpired) {
            console.log('✅ Valid ID token from localStorage');
            console.log('⏰ Token expires at:', new Date(payload.exp * 1000));
            return idToken;
          } else {
            console.log('⚠️ localStorage token expired, trying fresh token...');
          }
        } catch (tokenError) {
          console.log('⚠️ Error validating localStorage token, trying fresh token...');
        }
      }
      
      // Method 2: Try to get fresh token from Amplify (without identity pool)
      try {
        console.log('🔄 Attempting to get fresh ID token from Cognito...');
        
        // Use fetchAuthSession but handle identity pool errors gracefully
        const session = await fetchAuthSession({ forceRefresh: true });
        
        if (session.tokens?.idToken) {
          const freshIdToken = session.tokens.idToken.toString();
          console.log('✅ Fresh ID token obtained from Cognito');
          return freshIdToken;
        }
      } catch (sessionError: any) {
        console.log('⚠️ fetchAuthSession failed (identity pool issue):', sessionError.message);
        
        // If we have a localStorage token (even if expired), try using it as last resort
        if (idToken) {
          console.log('🔄 Using localStorage token as fallback...');
          return idToken;
        }
      }
      
      throw new Error('No authentication token available. Please log in again.');
      
    } catch (error: any) {
      console.error('❌ Error getting auth token:', error);
      
      if (error.name === 'UserUnAuthenticatedException') {
        throw new Error('Please log in to continue');
      } else {
        // Don't expose the specific error, just ask for re-login
        throw new Error('Authentication required. Please log in.');
      }
    }
  }

  private async getTokenAlternative(): Promise<string> {
    // This method is no longer needed since we handle everything in getAuthToken
    return this.getAuthToken();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    try {
      const token = await this.getAuthToken();
      
      console.log('🌐 Making authenticated request to:', `${API_BASE_URL}${endpoint}`);
      console.log('🔐 Using token (first 20 chars):', token.substring(0, 20) + '...');
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        mode: 'cors'
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Authentication expired. Please refresh the page and log in again.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Please check your permissions.');
        } else if (response.status === 404) {
          throw new Error('Resource not found.');
        } else {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('✅ Authenticated API response:', data);
      return data;
      
    } catch (error: any) {
      console.error('❌ Authenticated API error:', error);
      
      if (error.message.includes('Authentication expired')) {
        // Auto-reload on auth expiry
        console.log('🔄 Authentication expired, reloading page in 2 seconds...');
        setTimeout(() => window.location.reload(), 2000);
      }
      
      throw error;
    }
  }

  // ==================== PATIENT METHODS ====================
  
  // Create Patient
  async createPatient(patientData: any) {
    console.log('👤 Creating patient:', patientData.name);
    
    const patientId = patientData.patientId || `PAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.makeRequest('/patients', {
      method: 'POST',
      body: JSON.stringify({
        ...patientData,
        patientId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: patientData.status || 'active'
      })
    });
  }

  // Get Patient by ID
  async getPatient(patientId: string) {
    console.log('👤 Getting patient:', patientId);
    return this.makeRequest(`/patients/${patientId}`);
  }

  // Get All Patients
  async getPatients() {
    console.log('👥 Getting all patients');
    return this.makeRequest('/patients');
  }

  // Update Patient
  async updatePatient(patientId: string, patientData: any) {
    console.log('📝 Updating patient:', patientId);
    return this.makeRequest(`/patients/${patientId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...patientData,
        updatedAt: new Date().toISOString()
      })
    });
  }

  // Delete Patient
  async deletePatient(patientId: string) {
    console.log('🗑️ Deleting patient:', patientId);
    return this.makeRequest(`/patients/${patientId}`, {
      method: 'DELETE'
    });
  }

  // Search Patients
  async searchPatients(query: string) {
    if (!query || query.length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }
    
    console.log('🔍 Searching patients:', query);
    return this.makeRequest(`/patients/search?q=${encodeURIComponent(query)}`);
  }

  // Get Patients by Doctor
  async getDoctorPatients() {
    console.log('👨‍⚕️ Getting doctor patients');
    return this.makeRequest('/patients/doctor');
  }

  // ==================== MEDICINE METHODS ====================

  // Create Medicine
  async createMedicine(medicineData: any) {
    console.log('💊 Creating medicine:', medicineData.medicineName);
    
    const medicineId = medicineData.medicineId || `MED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.makeRequest('/medicines', {
      method: 'POST',
      body: JSON.stringify({
        ...medicineData,
        medicineId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: medicineData.status || 'active'
      })
    });
  }

  // Add Medicine (alias for createMedicine for backward compatibility)
  async addMedicine(medicineData: any) {
    return this.createMedicine(medicineData);
  }

  // Get Medicine by ID
  async getMedicine(medicineId: string) {
    console.log('💊 Getting medicine:', medicineId);
    return this.makeRequest(`/medicines/${medicineId}`);
  }

  // Get All Medicines
  async getMedicines() {
    console.log('💊 Getting all medicines');
    return this.makeRequest('/medicines');
  }

  // Update Medicine
  async updateMedicine(medicineId: string, medicineData: any) {
    console.log('📝 Updating medicine:', medicineId);
    return this.makeRequest(`/medicines/${medicineId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...medicineData,
        updatedAt: new Date().toISOString()
      })
    });
  }

  // Delete Medicine
  async deleteMedicine(medicineId: string) {
    console.log('🗑️ Deleting medicine:', medicineId);
    return this.makeRequest(`/medicines/${medicineId}`, {
      method: 'DELETE'
    });
  }

  // Search Medicines
  async searchMedicines(query: string) {
    if (!query || query.length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }
    
    console.log('🔍 Searching medicines:', query);
    return this.makeRequest(`/medicines/search?q=${encodeURIComponent(query)}`);
  }

  // Get Medicines by Category
  async getMedicinesByCategory(category: string) {
    console.log('🏷️ Getting medicines by category:', category);
    return this.makeRequest(`/medicines/category/${encodeURIComponent(category)}`);
  }

  // ==================== PRESCRIPTION METHODS ====================

  // Create Prescription
  async createPrescription(prescriptionData: any) {
    console.log('💊 Creating prescription with data:', prescriptionData);
    
    // Generate prescription ID if not provided
    const prescriptionId = prescriptionData.prescriptionId || `RX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return this.makeRequest('/prescriptions', {
      method: 'POST',
      body: JSON.stringify({
        ...prescriptionData,
        prescriptionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: prescriptionData.status || 'active'
      })
    });
  }

  // Get Prescription by ID
  async getPrescription(prescriptionId: string) {
    console.log('📄 Getting prescription:', prescriptionId);
    return this.makeRequest(`/prescriptions/${prescriptionId}`);
  }

  // Get All Prescriptions
  async getPrescriptions() {
    console.log('📄 Getting all prescriptions');
    return this.makeRequest('/prescriptions');
  }

  // Get Doctor's Prescriptions
  async getDoctorPrescriptions() {
    console.log('👨‍⚕️ Getting doctor prescriptions');
    return this.makeRequest('/prescriptions/doctor');
  }

  // Get Patient's Prescriptions
  async getPatientPrescriptions(patientId: string) {
    console.log('👤 Getting prescriptions for patient:', patientId);
    return this.makeRequest(`/prescriptions/patient/${patientId}`);
  }

  // Update Prescription
  async updatePrescription(prescriptionId: string, prescriptionData: any) {
    console.log('📝 Updating prescription:', prescriptionId);
    return this.makeRequest(`/prescriptions/${prescriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...prescriptionData,
        updatedAt: new Date().toISOString()
      })
    });
  }

  // Delete Prescription
  async deletePrescription(prescriptionId: string) {
    console.log('🗑️ Deleting prescription:', prescriptionId);
    return this.makeRequest(`/prescriptions/${prescriptionId}`, {
      method: 'DELETE'
    });
  }

  // Search Prescriptions
  async searchPrescriptions(query: string) {
    if (!query || query.length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }
    
    console.log('🔍 Searching prescriptions:', query);
    return this.makeRequest(`/prescriptions/search?q=${encodeURIComponent(query)}`);
  }

  // ==================== UTILITY METHODS ====================

  // Test authentication
  async testAuth() {
    try {
      console.log('🧪 Testing authentication...');
      
      // Check if user exists
      const currentUser = await getCurrentUser();
      console.log('👤 Current user:', currentUser.username);
      
      // Try to get token
      const token = await this.getAuthToken();
      console.log('🎫 Token obtained:', !!token);
      
      // Test API call using prescriptions endpoint (we know this works)
      try {
        const response = await this.makeRequest('/prescriptions');
        console.log('✅ API test successful:', response);
        
        return { 
          authenticated: true, 
          hasToken: !!token,
          username: currentUser.username,
          apiTest: 'success',
          message: 'Authentication working correctly'
        };
      } catch (apiError: any) {
        // Even if API call fails, if we got a token, auth is working
        if (token) {
          return { 
            authenticated: true, 
            hasToken: true,
            username: currentUser.username,
            apiTest: 'partial',
            message: 'Token obtained but API call failed',
            error: apiError.message
          };
        }
        throw apiError;
      }
      
    } catch (error: any) {
      console.error('🧪 Auth test failed:', error);
      return { 
        authenticated: false, 
        error: error.message,
        message: 'Authentication failed'
      };
    }
  }

  // Get current user info
  async getCurrentUserInfo() {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      // Decode ID token to get user attributes
      const idToken = session.tokens?.idToken?.toString();
      if (idToken) {
        const payload = JSON.parse(atob(idToken.split('.')[1]));
        return {
          username: currentUser.username,
          email: payload.email,
          name: payload.name,
          role: payload['custom:role'],
          phoneNumber: payload.phone_number
        };
      }
      
      return { username: currentUser.username };
    } catch (error) {
      console.error('❌ Error getting user info:', error);
      throw new Error('Could not get user information');
    }
  }

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  }

  // ==================== DASHBOARD & ANALYTICS METHODS ====================

  // Get Dashboard Stats
  async getDashboardStats() {
    console.log('📊 Getting dashboard statistics');
    return this.makeRequest('/dashboard/stats');
  }

  // Get Recent Activity
  async getRecentActivity(limit = 10) {
    console.log('📈 Getting recent activity, limit:', limit);
    return this.makeRequest(`/dashboard/activity?limit=${limit}`);
  }

  // Get Doctor Analytics
  async getDoctorAnalytics(timeframe = '30d') {
    console.log('📊 Getting doctor analytics for:', timeframe);
    return this.makeRequest(`/analytics/doctor?timeframe=${timeframe}`);
  }

  // ==================== BULK OPERATIONS ====================

  // Bulk Create Patients
  async bulkCreatePatients(patients: any[]) {
    console.log('👥 Bulk creating patients, count:', patients.length);
    return this.makeRequest('/patients/bulk', {
      method: 'POST',
      body: JSON.stringify({
        patients: patients.map(patient => ({
          ...patient,
          patientId: patient.patientId || `PAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: patient.status || 'active'
        }))
      })
    });
  }

  // Bulk Create Medicines
  async bulkCreateMedicines(medicines: any[]) {
    console.log('💊 Bulk creating medicines, count:', medicines.length);
    return this.makeRequest('/medicines/bulk', {
      method: 'POST',
      body: JSON.stringify({
        medicines: medicines.map(medicine => ({
          ...medicine,
          medicineId: medicine.medicineId || `MED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: medicine.status || 'active'
        }))
      })
    });
  }

  // ==================== EXPORT METHODS ====================

  // Export Patients
  async exportPatients(format = 'csv') {
    console.log('📤 Exporting patients in format:', format);
    return this.makeRequest(`/patients/export?format=${format}`);
  }

  // Export Medicines
  async exportMedicines(format = 'csv') {
    console.log('📤 Exporting medicines in format:', format);
    return this.makeRequest(`/medicines/export?format=${format}`);
  }

  // Export Prescriptions
  async exportPrescriptions(format = 'csv', dateRange?: { from: string, to: string }) {
    console.log('📤 Exporting prescriptions in format:', format);
    let endpoint = `/prescriptions/export?format=${format}`;
    
    if (dateRange) {
      endpoint += `&from=${dateRange.from}&to=${dateRange.to}`;
    }
    
    return this.makeRequest(endpoint);
  }
}

export default new AuthenticatedApiService();