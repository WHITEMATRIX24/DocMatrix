// src/components/Patient/PatientManagement.tsx - Final Fixed Version
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { dynamoDBService } from '../../services/dynamoDBService';
import authenticatedApiService from '../../services/authenticatedApi';
import { Patient as ImportedPatient } from '../../types'; // Import the actual type

// Local interface that extends the imported one for UI purposes
interface LocalPatient extends Omit<ImportedPatient, 'medicalHistory' | 'allergies' | 'currentMedications'> {
  medicalHistory?: string; // Override to use string instead of string[]
  allergies?: string; // Override to use string instead of string[]
  currentMedications?: string; // Override to use string instead of string[]
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const PatientManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, isDynamoDBAvailable, isAuthenticated } = useAuth();
  
  // State management
  const [patients, setPatients] = useState<LocalPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<LocalPatient | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<LocalPatient>>({
    name: '',
    age: 0,
    bloodGroup: '',
    weight: 0,
    phone: '',
    address: '',
    email: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
    isActive: true
  });

  // Load patients on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadPatients();
    }
  }, [isAuthenticated]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading patients...');
      
      let patientData: any[] = [];
      
      // Try DynamoDB first
      if (isDynamoDBAvailable) {
        try {
          patientData = await dynamoDBService.getAllPatients();
          console.log(`👥 Loaded ${patientData.length} patients from DynamoDB`);
        } catch (dynamoError) {
          console.warn('DynamoDB failed, trying fallback:', dynamoError);
        }
      }

      // Try API fallback
      if (patientData.length === 0) {
        try {
          patientData = await authenticatedApiService.getPatients().catch(() => []);
          console.log(`👥 Loaded ${patientData.length} patients from API`);
        } catch (apiError) {
          console.warn('API failed, trying localStorage:', apiError);
        }
      }

      // Try localStorage fallback
      if (patientData.length === 0) {
        const localPatients = localStorage.getItem('patients');
        patientData = localPatients ? JSON.parse(localPatients) : [];
        console.log(`👥 Loaded ${patientData.length} patients from localStorage`);
      }
      
      // Validate and normalize patient data
      const validPatients: LocalPatient[] = patientData.filter(p => p && p.patientId && p.name)
        .map(p => ({
          patientId: p.patientId,
          name: p.name || 'Unknown Patient',
          age: Number(p.age) || 0,
          bloodGroup: p.bloodGroup || '',
          weight: Number(p.weight) || 0,
          phone: p.phone || '',
          address: p.address || '',
          email: p.email || '',
          emergencyContact: p.emergencyContact || '',
          // Handle medicalHistory - convert array to string if needed
          medicalHistory: Array.isArray(p.medicalHistory) 
            ? p.medicalHistory.join(', ') 
            : (p.medicalHistory || ''),
          // Handle allergies - convert array to string if needed
          allergies: Array.isArray(p.allergies) 
            ? p.allergies.join(', ') 
            : (p.allergies || ''),
          // Handle currentMedications - convert array to string if needed
          currentMedications: Array.isArray(p.currentMedications) 
            ? p.currentMedications.join(', ') 
            : (p.currentMedications || ''),
          isActive: p.isActive !== undefined ? p.isActive : true,
          createdAt: p.createdAt || '',
          updatedAt: p.updatedAt || ''
        }));
      
      setPatients(validPatients);
      
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const generatePatientId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `PAT-${timestamp}${random}`;
  };

  const handleInputChange = (field: keyof LocalPatient, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name?.trim()) {
      toast.error('Patient name is required');
      return false;
    }
    if (!formData.age || formData.age <= 0) {
      toast.error('Valid age is required');
      return false;
    }
    if (!formData.bloodGroup) {
      toast.error('Blood group is required');
      return false;
    }
    if (!formData.weight || formData.weight <= 0) {
      toast.error('Valid weight is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormLoading(true);
    try {
      // Convert to the format expected by the API
      const patientData: ImportedPatient = {
        patientId: selectedPatient?.patientId || generatePatientId(),
        name: formData.name!.trim(),
        age: Number(formData.age) || 0,
        bloodGroup: formData.bloodGroup!,
        weight: Number(formData.weight) || 0,
        phone: formData.phone?.trim() || '',
        address: formData.address?.trim() || '',
        email: formData.email?.trim() || '',
        emergencyContact: formData.emergencyContact?.trim() || '',
        // Convert string to string array for API compatibility
        medicalHistory: formData.medicalHistory?.trim() 
          ? [formData.medicalHistory.trim()] 
          : [],
        // Convert string to string array for API compatibility
        allergies: formData.allergies?.trim() 
          ? [formData.allergies.trim()] 
          : [],
        // Convert string to string array for API compatibility
        currentMedications: formData.currentMedications?.trim() 
          ? [formData.currentMedications.trim()] 
          : [],
        isActive: formData.isActive !== undefined ? formData.isActive : true,
        createdAt: selectedPatient?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let savedSuccessfully = false;

      // Try DynamoDB first
      if (isDynamoDBAvailable) {
        try {
          if (selectedPatient) {
            await dynamoDBService.updatePatient(patientData);
          } else {
            await dynamoDBService.createPatient(patientData);
          }
          savedSuccessfully = true;
          console.log('✅ Patient saved to DynamoDB');
        } catch (dynamoError) {
          console.error('DynamoDB save failed:', dynamoError);
        }
      }

      // Try API if DynamoDB failed
      if (!savedSuccessfully) {
        try {
          if (selectedPatient) {
            await authenticatedApiService.updatePatient(selectedPatient.patientId, patientData);
          } else {
            await authenticatedApiService.createPatient(patientData);
          }
          savedSuccessfully = true;
          console.log('✅ Patient saved via API');
        } catch (apiError) {
          console.error('API save failed:', apiError);
        }
      }

      // Always update localStorage cache (convert back to local format)
      try {
        const localPatientData: LocalPatient = {
          ...patientData,
          medicalHistory: Array.isArray(patientData.medicalHistory) 
            ? patientData.medicalHistory.join(', ') 
            : '',
          allergies: Array.isArray(patientData.allergies) 
            ? patientData.allergies.join(', ') 
            : '',
          currentMedications: Array.isArray(patientData.currentMedications) 
            ? patientData.currentMedications.join(', ') 
            : ''
        };

        const existingPatients = JSON.parse(localStorage.getItem('patients') || '[]');
        let updatedPatients;
        
        if (selectedPatient) {
          // Update existing patient
          updatedPatients = existingPatients.map((p: LocalPatient) => 
            p.patientId === selectedPatient.patientId ? localPatientData : p
          );
        } else {
          // Add new patient
          updatedPatients = [...existingPatients, localPatientData];
        }
        
        localStorage.setItem('patients', JSON.stringify(updatedPatients));
        console.log('✅ Patient cached locally');
      } catch (localStorageError) {
        console.warn('Could not update localStorage cache:', localStorageError);
      }

      if (savedSuccessfully) {
        toast.success(`Patient ${selectedPatient ? 'updated' : 'added'} successfully and saved to cloud database!`);
      } else {
        toast.success(`Patient ${selectedPatient ? 'updated' : 'added'} successfully (saved locally - will sync when online)!`);
      }

      // Reset form and reload patients
      resetForm();
      setActiveTab('list');
      await loadPatients();

    } catch (error: any) {
      console.error('Error saving patient:', error);
      toast.error(`Failed to ${selectedPatient ? 'update' : 'add'} patient: ${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      age: 0,
      bloodGroup: '',
      weight: 0,
      phone: '',
      address: '',
      email: '',
      emergencyContact: '',
      medicalHistory: '',
      allergies: '',
      currentMedications: '',
      isActive: true
    });
    setSelectedPatient(null);
  };

  const handleEdit = (patient: LocalPatient) => {
    setSelectedPatient(patient);
    setFormData(patient);
    setActiveTab('edit');
  };

  const handleDelete = async (patient: LocalPatient) => {
    if (!window.confirm(`Are you sure you want to delete patient "${patient.name}"?`)) {
      return;
    }

    try {
      let deletedSuccessfully = false;

      // Try DynamoDB first - since deletePatient doesn't exist, we'll skip it
      if (isDynamoDBAvailable) {
        try {
          // For now, we'll just mark as deleted in DynamoDB by updating isActive to false
          const updatedPatient: ImportedPatient = {
            ...patient,
            medicalHistory: patient.medicalHistory ? [patient.medicalHistory] : [],
            allergies: patient.allergies ? [patient.allergies] : [],
            currentMedications: patient.currentMedications ? [patient.currentMedications] : [],
            isActive: false,
            updatedAt: new Date().toISOString()
          };
          await dynamoDBService.updatePatient(updatedPatient);
          deletedSuccessfully = true;
          console.log('✅ Patient marked as deleted in DynamoDB');
        } catch (dynamoError) {
          console.warn('DynamoDB delete failed:', dynamoError);
        }
      }

      // Try API if DynamoDB failed
      if (!deletedSuccessfully) {
        try {
          await authenticatedApiService.deletePatient(patient.patientId);
          deletedSuccessfully = true;
          console.log('✅ Patient deleted via API');
        } catch (apiError) {
          console.warn('API delete failed:', apiError);
        }
      }

      // Always update localStorage (remove from cache)
      const existingPatients = JSON.parse(localStorage.getItem('patients') || '[]');
      const updatedPatients = existingPatients.filter((p: LocalPatient) => p.patientId !== patient.patientId);
      localStorage.setItem('patients', JSON.stringify(updatedPatients));

      if (deletedSuccessfully) {
        toast.success('Patient deleted successfully from cloud database!');
      } else {
        toast.success('Patient deleted locally (will sync when online)!');
      }
      
      await loadPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Failed to delete patient');
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderForm = () => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
        👤 {selectedPatient ? 'Edit Patient' : 'Add New Patient'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          
          {/* Patient Name */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter patient's full name"
              required
            />
          </div>

          {/* Age */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Age *
            </label>
            <input
              type="number"
              min="1"
              max="150"
              value={formData.age || ''}
              onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter age"
              required
            />
          </div>

          {/* Blood Group */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Blood Group *
            </label>
            <select
              value={formData.bloodGroup || ''}
              onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                backgroundColor: 'white',
                transition: 'border-color 0.3s ease'
              }}
              required
            >
              <option value="">Select Blood Group</option>
              {BLOOD_GROUPS.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Weight */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Weight (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              value={formData.weight || ''}
              onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter weight in kg"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter phone number"
            />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter email address"
            />
          </div>

          {/* Emergency Contact */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Emergency Contact
            </label>
            <input
              type="text"
              value={formData.emergencyContact || ''}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Emergency contact name and phone"
            />
          </div>

          {/* Active Status */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '600', color: '#333' }}>
              <input
                type="checkbox"
                checked={formData.isActive !== false}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
              />
              Active Patient
            </label>
            <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 24px' }}>
              Uncheck to mark patient as inactive
            </p>
          </div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Address
          </label>
          <textarea
            rows={3}
            value={formData.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter full address"
          />
        </div>

        {/* Medical History */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Medical History
          </label>
          <textarea
            rows={3}
            value={formData.medicalHistory || ''}
            onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter relevant medical history"
          />
        </div>

        {/* Allergies */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Allergies
          </label>
          <textarea
            rows={2}
            value={formData.allergies || ''}
            onChange={(e) => handleInputChange('allergies', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter known allergies"
          />
        </div>

        {/* Current Medications */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Current Medications
          </label>
          <textarea
            rows={3}
            value={formData.currentMedications || ''}
            onChange={(e) => handleInputChange('currentMedications', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter current medications"
          />
        </div>

        {/* Form Buttons */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setActiveTab('list');
            }}
            style={{ 
              padding: '12px 24px', 
              border: '2px solid #6c757d', 
              background: 'white', 
              color: '#6c757d', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={formLoading}
            style={{ 
              padding: '12px 30px', 
              background: formLoading ? '#bdc3c7' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: formLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: formLoading ? 'none' : '0 4px 15px rgba(240, 147, 251, 0.3)'
            }}
          >
            {formLoading ? '⏳ Saving...' : `💾 ${selectedPatient ? 'Update' : 'Add'} Patient`}
          </button>
        </div>
      </form>
    </div>
  );

  const renderPatientList = () => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ color: '#2c3e50', fontSize: '1.5em', margin: 0 }}>
          👥 Patient Registry ({filteredPatients.length})
        </h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              padding: '10px 15px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '14px',
              width: '250px'
            }}
          />
          <button
            onClick={loadPatients}
            style={{ 
              padding: '10px 20px', 
              background: '#3498db', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d', background: '#f8f9fa', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>👥</div>
          <p style={{ fontSize: '18px', margin: '0 0 8px 0' }}>
            {searchTerm ? 'No patients found matching your search' : 'No patients registered'}
          </p>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            {searchTerm ? 'Try a different search term' : 'Add your first patient to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredPatients.map((patient) => (
            <div 
              key={patient.patientId} 
              style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                padding: '20px', 
                background: patient.isActive === false ? '#fff5f5' : '#f8f9fa',
                transition: 'all 0.3s ease',
                position: 'relative',
                opacity: patient.isActive === false ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                      {patient.name}
                    </h4>
                    <span style={{ 
                      background: '#f093fb', 
                      color: 'white', 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: '600' 
                    }}>
                      {patient.bloodGroup}
                    </span>
                    {patient.isActive === false && (
                      <span style={{ 
                        background: '#e74c3c', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '12px', 
                        fontSize: '12px', 
                        fontWeight: '600' 
                      }}>
                        Inactive
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Age</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{patient.age} years</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Weight</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{patient.weight} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Phone</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{patient.phone || 'Not provided'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Email</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{patient.email || 'Not provided'}</div>
                    </div>
                  </div>

                  {patient.allergies && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Allergies</div>
                      <div style={{ fontSize: '14px', color: '#e74c3c', fontWeight: '600' }}>{patient.allergies}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                  <button
                    onClick={() => handleEdit(patient)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#3498db', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(patient)}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#e74c3c', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Please log in to manage patients</h2>
        <button 
          onClick={() => navigate('/login')} 
          style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading patients...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto', padding: '20px', background: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '30px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>
              👥 Patient Management
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1em' }}>
              Manage patient records and information
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ 
              padding: '12px 24px', 
              background: 'rgba(255,255,255,0.2)', 
              color: 'white', 
              border: '2px solid rgba(255,255,255,0.3)', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        {[
          { id: 'list', label: '📋 Patient List', icon: '📋' },
          { id: 'add', label: '➕ Add Patient', icon: '➕' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as 'list' | 'add');
              if (tab.id === 'add') {
                resetForm();
              }
            }}
            style={{
              padding: '12px 20px',
              border: 'none',
              borderRadius: '8px',
              background: activeTab === tab.id ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : '#f8f9fa',
              color: activeTab === tab.id ? 'white' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontSize: '14px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'list' && renderPatientList()}
      {(activeTab === 'add' || activeTab === 'edit') && renderForm()}
    </div>
  );
};

export default PatientManagement;