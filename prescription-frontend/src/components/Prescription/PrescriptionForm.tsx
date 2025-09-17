// src/components/Prescription/PrescriptionForm.tsx - Updated with proper error handling and Vite support
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { dynamoDBService } from '../../services/dynamoDBService';
interface EnhancedPrescriptionFormProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}
// Enhanced Medicine Search Component with proper error handling
const MedicineSearch: React.FC<{
  onMedicineSelect: (medicine: any) => void;
  initialValue?: string;
  placeholder?: string;
}> = ({ onMedicineSelect, initialValue = '', placeholder = 'Search medicines...' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [allMedicines, setAllMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Load all medicines on component mount
  useEffect(() => {
    loadAllMedicines();
  }, []);

  // Filter medicines when search term changes with safe property access
  useEffect(() => {
    if (searchTerm.length > 1) {
      const filtered = allMedicines.filter(medicine => {
        if (!medicine) return false;
        
        // Safe property access with fallbacks
        const medicineName = medicine.medicineName || medicine.name || '';
        const composition = medicine.composition || '';
        const manufacturer = medicine.manufacturer || '';
        const category = medicine.category || '';
        
        const searchLower = searchTerm.toLowerCase();
        
        return (
          medicineName.toLowerCase().includes(searchLower) ||
          composition.toLowerCase().includes(searchLower) ||
          manufacturer.toLowerCase().includes(searchLower) ||
          category.toLowerCase().includes(searchLower)
        );
      });
      setMedicines(filtered.slice(0, 10)); // Limit to 10 results
      setShowDropdown(filtered.length > 0);
    } else {
      setMedicines([]);
      setShowDropdown(false);
    }
  }, [searchTerm, allMedicines]);

  const loadAllMedicines = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading medicines for search...');
      
      // Try DynamoDB first
      let medicineData: any[] = [];
      
      try {
        medicineData = await dynamoDBService.getAllMedicines();
        console.log(`💊 Loaded ${medicineData.length} medicines from DynamoDB`);
      } catch (dynamoError) {
        console.warn('DynamoDB failed, trying localStorage:', dynamoError);
        medicineData = JSON.parse(localStorage.getItem('medicines') || '[]');
        console.log(`💊 Loaded ${medicineData.length} medicines from localStorage`);
      }
      
      // Validate and normalize medicine data
      const validMedicines = medicineData.filter(m => {
        return m && (m.medicineId || m.id) && (m.medicineName || m.name);
      }).map(m => ({
        medicineId: m.medicineId || m.id,
        medicineName: m.medicineName || m.name || 'Unknown Medicine',
        composition: m.composition || '',
        manufacturer: m.manufacturer || '',
        category: m.category || '',
        dosageForm: m.dosageForm || '',
        strength: m.strength || '',
        price: m.price || 0,
        stockQuantity: m.stockQuantity || 0
      }));
      
      setAllMedicines(validMedicines);
      
    } catch (error) {
      console.error('Error loading medicines:', error);
      toast.warning('Could not load medicines. Please try refreshing the page.');
      setAllMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineSelect = (medicine: any) => {
    const medicineName = medicine.medicineName || medicine.name || 'Unknown Medicine';
    setSearchTerm(medicineName);
    setShowDropdown(false);
    onMedicineSelect(medicine);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={loading ? 'Loading medicines...' : placeholder}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          border: '2px solid #bdc3c7',
          borderRadius: '8px',
          fontSize: '16px',
          transition: 'border-color 0.3s ease'
        }}
        onFocus={() => searchTerm.length > 1 && setShowDropdown(medicines.length > 0)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
      />
      
      {showDropdown && medicines.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {medicines.map((medicine, index) => {
            const medicineName = medicine.medicineName || medicine.name || 'Unknown Medicine';
            const composition = medicine.composition || '';
            const manufacturer = medicine.manufacturer || '';
            const category = medicine.category || '';
            
            return (
              <div
                key={medicine.medicineId || index}
                onClick={() => handleMedicineSelect(medicine)}
                style={{
                  padding: '12px',
                  borderBottom: index < medicines.length - 1 ? '1px solid #eee' : 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ fontWeight: '600', color: '#2c3e50' }}>{medicineName}</div>
                {composition && (
                  <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '2px' }}>
                    {composition} {manufacturer && `• ${manufacturer}`}
                  </div>
                )}
                {category && (
                  <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '2px' }}>
                    {category} {medicine.dosageForm && `• ${medicine.dosageForm}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {searchTerm.length > 1 && medicines.length === 0 && !loading && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          zIndex: 1000,
          padding: '12px',
          textAlign: 'center',
          color: '#7f8c8d'
        }}>
          No medicines found. <button 
            onClick={() => window.open('/medicine/add', '_blank')}
            style={{ color: '#007bff', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Add new medicine?
          </button>
        </div>
      )}
    </div>
  );
};

// Form data interface
interface PrescriptionFormData {
  patientDetails: {
    name: string;
    age: number;
    bloodGroup: string;
    weight: number;
    phone: string;
    address: string;
  };
  symptoms: string;
  diagnosis: string;
  chiefComplaint: string;
  presentIllnessHistory: string;
  physicalExamination: string;
  vitals: {
    bloodPressureSystolic: number | '';
    bloodPressureDiastolic: number | '';
    pulseRate: number | '';
    height: number | '';
    temperature: number | '';
    sugarLevel: {
      preMeal: number | '';
      postMeal: number | '';
      fastingGlucose: number | '';
      randomGlucose: number | '';
    };
  };
  medicines: any[];
  instructions: string;
  followUpDate: string;
  priority: 'normal' | 'urgent' | 'emergency';
  notes: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const MEDICINE_FREQUENCIES = [
  'Once daily (OD)',
  'Twice daily (BD)', 
  'Thrice daily (TDS)',
  'Four times daily (QDS)',
  'Every 4 hours',
  'Every 6 hours', 
  'Every 8 hours',
  'Every 12 hours',
  'As needed (PRN)',
  'Before meals (AC)',
  'After meals (PC)',
  'At bedtime (HS)',
  'On empty stomach',
  'With food'
];

const COMMON_DURATIONS = [
  '3 days',
  '5 days', 
  '7 days',
  '10 days',
  '14 days',
  '21 days',
  '1 month',
  '2 months',
  '3 months',
  'As directed',
  'Until finished',
  'Continuous'
];

const EnhancedPrescriptionForm: React.FC<EnhancedPrescriptionFormProps>  = ({ onCancel, onSuccess })  => {
  const { prescriptionId } = useParams<{ prescriptionId?: string }>();
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!prescriptionId);
  const [isEditMode, setIsEditMode] = useState(!!prescriptionId);
  const [originalPrescription, setOriginalPrescription] = useState<any>(null);
  const [formProgress, setFormProgress] = useState(0);
  const [patientSuggestions, setPatientSuggestions] = useState<any[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState(false);
  
  const [currentMedicine, setCurrentMedicine] = useState({
    medicineId: '',
    medicineName: '',
    composition: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  const { register, control, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<PrescriptionFormData>({
    defaultValues: {
      patientDetails: {
        name: '',
        age: 0,
        bloodGroup: '',
        weight: 0,
        phone: '',
        address: ''
      },
      symptoms: '',
      diagnosis: '',
      chiefComplaint: '',
      presentIllnessHistory: '',
      physicalExamination: '',
      vitals: {
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        pulseRate: '',
        height: '',
        temperature: '',
        sugarLevel: {
          preMeal: '',
          postMeal: '',
          fastingGlucose: '',
          randomGlucose: ''
        }
      },
      medicines: [],
      instructions: '',
      followUpDate: '',
      priority: 'normal',
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'medicines'
  });

  const watchedFields = watch();
  const watchedPatientName = watch('patientDetails.name');

  // Calculate form completion progress
  useEffect(() => {
    const requiredFields = [
      'patientDetails.name', 'patientDetails.age', 'patientDetails.weight', 
      'patientDetails.phone', 'patientDetails.address', 'symptoms'
    ];
    const completedFields = requiredFields.filter(field => {
      const value = field.split('.').reduce((obj, key) => (obj as any)?.[key], watchedFields);
      return value && value.toString().trim();
    });
    const progress = ((completedFields.length / requiredFields.length) * 70) + (fields.length > 0 ? 30 : 0);
    setFormProgress(Math.min(progress, 100));
  }, [watchedFields, fields.length]);

  // Load patients for autocomplete with safe property access
  useEffect(() => {
    if (watchedPatientName && watchedPatientName.length > 1) {
      searchPatients(watchedPatientName);
    } else {
      setPatientSuggestions([]);
      setShowPatientSuggestions(false);
    }
  }, [watchedPatientName]);

  // Load prescription for editing
  useEffect(() => {
    if (prescriptionId && isEditMode) {
      loadPrescriptionForEdit();
    }
  }, [prescriptionId, isEditMode]);

  const searchPatients = async (searchTerm: string) => {
    try {
      console.log('🔍 Searching patients:', searchTerm);
      
      let patients: any[] = [];
      
      // Try DynamoDB search method if it exists
      try {
        if (typeof dynamoDBService.searchPatients === 'function') {
          patients = await dynamoDBService.searchPatients(searchTerm);
        } else {
          // Fallback: get all patients and filter locally
          const allPatients = await dynamoDBService.getAllPatients();
          patients = allPatients.filter((p: any) => {
            if (!p) return false;
            const name = p.name || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
          });
        }
      } catch (dynamoError) {
        console.warn('DynamoDB patient search failed, using localStorage');
        const allPatients = JSON.parse(localStorage.getItem('patients') || '[]');
        patients = allPatients.filter((p: any) => {
          if (!p || !p.name) return false;
          return p.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
      }
      
      // Validate patient data
      const validPatients = patients.filter(p => p && p.patientId && p.name).slice(0, 5);
      
      setPatientSuggestions(validPatients);
      setShowPatientSuggestions(validPatients.length > 0);
      
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientSuggestions([]);
      setShowPatientSuggestions(false);
    }
  };

  const selectPatient = (patient: any) => {
    setValue('patientDetails.name', patient.name || '');
    setValue('patientDetails.age', patient.age || 0);
    setValue('patientDetails.bloodGroup', patient.bloodGroup || '');
    setValue('patientDetails.weight', patient.weight || 0);
    setValue('patientDetails.phone', patient.phone || '');
    setValue('patientDetails.address', patient.address || '');
    setShowPatientSuggestions(false);
    toast.success('Patient details filled automatically');
  };

  const loadPrescriptionForEdit = async () => {
    try {
      setInitialLoading(true);
      console.log('📋 Loading prescription for edit:', prescriptionId);
      
      let prescription;
      
      try {
        prescription = await dynamoDBService.getPrescription(prescriptionId!);
      } catch (dynamoError) {
        console.warn('DynamoDB failed, checking localStorage');
        const allPrescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
        prescription = allPrescriptions.find((p: any) => p.prescriptionId === prescriptionId);
      }
      
      if (!prescription) {
        toast.error('Prescription not found');
        navigate('/dashboard');
        return;
      }

      setOriginalPrescription(prescription);
      
      // Populate form with existing data with safe property access
      reset({
        patientDetails: {
          name: prescription.patientDetails?.name || '',
          age: prescription.patientDetails?.age || 0,
          bloodGroup: prescription.patientDetails?.bloodGroup || '',
          weight: prescription.patientDetails?.weight || 0,
          phone: prescription.patientDetails?.phone || '',
          address: prescription.patientDetails?.address || ''
        },
        symptoms: prescription.symptoms || '',
        diagnosis: prescription.diagnosis || '',
        chiefComplaint: prescription.chiefComplaint || '',
        presentIllnessHistory: prescription.presentIllnessHistory || '',
        physicalExamination: prescription.physicalExamination || '',
        vitals: {
          bloodPressureSystolic: prescription.vitals?.bloodPressureSystolic || '',
          bloodPressureDiastolic: prescription.vitals?.bloodPressureDiastolic || '',
          pulseRate: prescription.vitals?.pulseRate || '',
          height: prescription.vitals?.height || '',
          temperature: prescription.vitals?.temperature || '',
          sugarLevel: {
            preMeal: prescription.vitals?.sugarLevel?.preMeal || '',
            postMeal: prescription.vitals?.sugarLevel?.postMeal || '',
            fastingGlucose: prescription.vitals?.sugarLevel?.fastingGlucose || '',
            randomGlucose: prescription.vitals?.sugarLevel?.randomGlucose || ''
          }
        },
        medicines: prescription.medicines || [],
        instructions: prescription.instructions || '',
        followUpDate: prescription.followUpDate || '',
        priority: prescription.priority || 'normal',
        notes: prescription.notes || ''
      });

    } catch (error) {
      console.error('Error loading prescription:', error);
      toast.error('Error loading prescription data');
      navigate('/dashboard');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleMedicineSelect = (medicine: any) => {
    setCurrentMedicine(prev => ({
      ...prev,
      medicineId: medicine.medicineId || '',
      medicineName: medicine.medicineName || medicine.name || '',
      composition: medicine.composition || ''
    }));
  };

  const addMedicine = () => {
    if (!currentMedicine.medicineName) {
      toast.error('Please select a medicine');
      return;
    }
    
    if (!currentMedicine.dosage || !currentMedicine.frequency || !currentMedicine.duration) {
      toast.error('Please fill in dosage, frequency, and duration');
      return;
    }

    // Check if medicine already exists
    const existingMedicine = fields.find(field => field.medicineId === currentMedicine.medicineId);
    if (existingMedicine) {
      toast.error('This medicine is already added to the prescription');
      return;
    }

    append({
      medicineId: currentMedicine.medicineId,
      medicineName: currentMedicine.medicineName,
      composition: currentMedicine.composition,
      dosage: currentMedicine.dosage,
      frequency: currentMedicine.frequency,
      duration: currentMedicine.duration,
      instructions: currentMedicine.instructions
    });

    // Reset current medicine
    setCurrentMedicine({
      medicineId: '',
      medicineName: '',
      composition: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: ''
    });

    toast.success('Medicine added to prescription');
  };

  const generatePrescriptionId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `RX-${timestamp}${random}`;
  };

  const onSubmit = async (data: PrescriptionFormData) => {
    if (data.medicines.length === 0) {
      toast.error('Please add at least one medicine to the prescription');
      return;
    }

    setLoading(true);
    try {
      // Prepare vitals data (only include non-empty values)
      const vitals: any = {};
      
      if (data.vitals.bloodPressureSystolic && data.vitals.bloodPressureDiastolic) {
        vitals.bloodPressureSystolic = Number(data.vitals.bloodPressureSystolic);
        vitals.bloodPressureDiastolic = Number(data.vitals.bloodPressureDiastolic);
      }
      
      if (data.vitals.pulseRate) vitals.pulseRate = Number(data.vitals.pulseRate);
      if (data.vitals.height) vitals.height = Number(data.vitals.height);
      if (data.vitals.temperature) vitals.temperature = Number(data.vitals.temperature);
      
      if (data.vitals.sugarLevel.preMeal || data.vitals.sugarLevel.postMeal || 
          data.vitals.sugarLevel.fastingGlucose || data.vitals.sugarLevel.randomGlucose) {
        vitals.sugarLevel = {};
        if (data.vitals.sugarLevel.preMeal) vitals.sugarLevel.preMeal = Number(data.vitals.sugarLevel.preMeal);
        if (data.vitals.sugarLevel.postMeal) vitals.sugarLevel.postMeal = Number(data.vitals.sugarLevel.postMeal);
        if (data.vitals.sugarLevel.fastingGlucose) vitals.sugarLevel.fastingGlucose = Number(data.vitals.sugarLevel.fastingGlucose);
        if (data.vitals.sugarLevel.randomGlucose) vitals.sugarLevel.randomGlucose = Number(data.vitals.sugarLevel.randomGlucose);
      }

      if (isEditMode && originalPrescription) {
        // Update existing prescription
        const updateData = {
          symptoms: data.symptoms,
          diagnosis: data.diagnosis,
          medicines: data.medicines,
          instructions: data.instructions,
          followUpDate: data.followUpDate,
          priority: data.priority,
          vitals,
          chiefComplaint: data.chiefComplaint,
          presentIllnessHistory: data.presentIllnessHistory,
          physicalExamination: data.physicalExamination,
          notes: data.notes,
          modificationReason: 'Updated by doctor'
        };

        try {
          // Use updatePrescription method
          await dynamoDBService.updatePrescription(originalPrescription.prescriptionId, updateData);
          
          // Update localStorage cache
          const existingPrescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
          const updatedPrescriptions = existingPrescriptions.map((p: any) => 
            p.prescriptionId === originalPrescription.prescriptionId ? { ...originalPrescription, ...updateData, updatedAt: new Date().toISOString() } : p
          );
          localStorage.setItem('prescriptions', JSON.stringify(updatedPrescriptions));
          
          toast.success('Prescription updated successfully!');
        } catch (error) {
          console.error('DynamoDB update failed, updating localStorage only:', error);
          
          // Fallback to localStorage only
          const existingPrescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
          const updatedPrescriptions = existingPrescriptions.map((p: any) => 
            p.prescriptionId === originalPrescription.prescriptionId ? { ...originalPrescription, ...updateData, updatedAt: new Date().toISOString() } : p
          );
          localStorage.setItem('prescriptions', JSON.stringify(updatedPrescriptions));
          
          toast.success('Prescription updated locally (will sync when online)!');
        }
        
      } else {
        // Create new prescription
        const prescriptionData = {
          prescriptionId: generatePrescriptionId(),
          patientId: `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          patientDetails: {
            ...data.patientDetails,
            weight: data.patientDetails.weight || 0,
          },
          doctorId: userProfile?.UserId || user?.userId || 'unknown',
          doctorName: userProfile?.name || user?.username || 'Unknown Doctor',
          symptoms: data.symptoms,
          diagnosis: data.diagnosis,
          medicines: data.medicines,
          instructions: data.instructions,
          followUpDate: data.followUpDate,
          priority: data.priority,
          vitals,
          chiefComplaint: data.chiefComplaint,
          presentIllnessHistory: data.presentIllnessHistory,
          physicalExamination: data.physicalExamination,
          notes: data.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active'
        };

        let savedSuccessfully = false;

        // Try DynamoDB first
        try {
          await dynamoDBService.createPrescription(prescriptionData);
          savedSuccessfully = true;
          console.log('✅ Prescription saved to DynamoDB');
        } catch (dynamoError) {
          console.error('DynamoDB save failed:', dynamoError);
        }

        // Always update localStorage cache
        try {
          const existingPrescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
          const updatedPrescriptions = [...existingPrescriptions, prescriptionData];
          localStorage.setItem('prescriptions', JSON.stringify(updatedPrescriptions));
          console.log('✅ Prescription cached locally');
        } catch (localStorageError) {
          console.warn('Could not update localStorage cache:', localStorageError);
        }

        if (savedSuccessfully) {
          toast.success('Prescription created successfully and saved to cloud database!');
             if (onSuccess) onSuccess(); // <-- go back to list & refresh
        } else {
          toast.success('Prescription created successfully (saved locally - will sync when online)!');
             if (onSuccess) onSuccess(); // <-- go back to list & refresh
        }
      }

      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Error saving prescription:', error);
      toast.error(error.message || 'Error saving prescription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Vitals helper functions
  const getBloodPressureCategory = (systolic: number, diastolic: number): string => {
    if (systolic < 120 && diastolic < 80) return 'Normal';
    if (systolic < 130 && diastolic < 80) return 'Elevated';
    if (systolic < 140 || diastolic < 90) return 'High Blood Pressure Stage 1';
    if (systolic >= 140 || diastolic >= 90) return 'High Blood Pressure Stage 2';
    return 'Hypertensive Crisis';
  };

  const getTemperatureCategory = (temp: number): string => {
    if (temp < 97) return 'Low';
    if (temp <= 99.5) return 'Normal';
    if (temp <= 100.4) return 'Low-grade fever';
    if (temp <= 102.2) return 'Moderate fever';
    return 'High fever';
  };

  const renderProgressBar = () => (
    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>Prescription Progress</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: formProgress === 100 ? '#27ae60' : '#f39c12' }}>
          {Math.round(formProgress)}%
        </span>
      </div>
      <div style={{ width: '100%', height: '8px', backgroundColor: '#ecf0f1', borderRadius: '4px', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${formProgress}%`, 
            height: '100%', 
            background: formProgress === 100 ? 'linear-gradient(90deg, #27ae60, #2ecc71)' : 'linear-gradient(90deg, #f39c12, #e67e22)',
            transition: 'all 0.3s ease',
            borderRadius: '4px'
          }} 
        />
      </div>
      <div style={{ fontSize: '12px', color: '#7f8c8d', marginTop: '4px' }}>
        {formProgress < 70 ? 'Complete patient details and symptoms' : 
         fields.length === 0 ? 'Add medicines to complete prescription' : 
         'Ready to save prescription'}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Please log in to create prescriptions</h2>
        <button onClick={() => navigate('/login')} style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px' }}>
          Go to Login
        </button>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading prescription data...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px', background: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>
              📝 {isEditMode ? 'Edit Prescription' : 'Create New Prescription'}
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1em' }}>
              {isEditMode ? 'Update prescription details' : 'Create a comprehensive digital prescription'}
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

      {/* Progress Bar */}
      {renderProgressBar()}
      
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Patient Details Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
            👤 Patient Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                Patient Name *
              </label>
              <input
                {...register('patientDetails.name', { 
                  required: 'Patient name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' }
                })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: `2px solid ${errors.patientDetails?.name ? '#e74c3c' : '#bdc3c7'}`, 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Enter patient's full name"
                onFocus={() => watchedPatientName.length > 1 && setShowPatientSuggestions(patientSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowPatientSuggestions(false), 200)}
              />
              {errors.patientDetails?.name && (
                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.patientDetails.name.message}</p>
              )}
              
              {/* Patient Suggestions Dropdown */}
              {showPatientSuggestions && patientSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {patientSuggestions.map((patient, index) => (
                    <div
                      key={patient.patientId || index}
                      onClick={() => selectPatient(patient)}
                      style={{
                        padding: '12px',
                        borderBottom: index < patientSuggestions.length - 1 ? '1px solid #eee' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: '600', color: '#2c3e50' }}>{patient.name}</div>
                      <div style={{ fontSize: '12px', color: '#7f8c8d' }}>
                        Age: {patient.age} • {patient.bloodGroup} • {patient.weight}kg
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Age *</label>
              <input
                type="number"
                {...register('patientDetails.age', { 
                  required: 'Age is required',
                  min: { value: 0, message: 'Age must be positive' },
                  max: { value: 150, message: 'Age must be realistic' }
                })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: `2px solid ${errors.patientDetails?.age ? '#e74c3c' : '#bdc3c7'}`, 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Enter age"
              />
              {errors.patientDetails?.age && (
                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.patientDetails.age.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Blood Group</label>
              <select
                {...register('patientDetails.bloodGroup')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'border-color 0.3s ease'
                }}
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                {...register('patientDetails.weight', {
                  required: 'Weight is required',
                  min: { value: 1, message: 'Weight must be at least 1 kg' },
                  max: { value: 500, message: 'Weight must be realistic' }
                })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: `2px solid ${errors.patientDetails?.weight ? '#e74c3c' : '#bdc3c7'}`, 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Enter weight"
              />
              {errors.patientDetails?.weight && (
                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.patientDetails.weight.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Phone Number *</label>
              <input
                type="tel"
                {...register('patientDetails.phone', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Phone number must be 10 digits'
                  }
                })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: `2px solid ${errors.patientDetails?.phone ? '#e74c3c' : '#bdc3c7'}`, 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Enter 10-digit phone number"
              />
              {errors.patientDetails?.phone && (
                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.patientDetails.phone.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Address *</label>
              <input
                {...register('patientDetails.address', { 
                  required: 'Address is required',
                  minLength: { value: 10, message: 'Address must be at least 10 characters' }
                })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: `2px solid ${errors.patientDetails?.address ? '#e74c3c' : '#bdc3c7'}`, 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Enter complete address"
              />
              {errors.patientDetails?.address && (
                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.patientDetails.address.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Patient Vitals Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #9b59b6', paddingBottom: '10px' }}>
            📊 Patient Vitals
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Blood Pressure */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '1.1em' }}>🩸 Blood Pressure</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Systolic</label>
                  <input
                    type="number"
                    {...register('vitals.bloodPressureSystolic')}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                    placeholder="120"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '4px' }}>Diastolic</label>
                  <input
                    type="number"
                    {...register('vitals.bloodPressureDiastolic')}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                    placeholder="80"
                  />
                </div>
              </div>
              {watchedFields.vitals.bloodPressureSystolic && watchedFields.vitals.bloodPressureDiastolic && (
                <div style={{ fontSize: '12px', color: '#666', background: '#fff', padding: '8px', borderRadius: '6px' }}>
                  <div>{watchedFields.vitals.bloodPressureSystolic}/{watchedFields.vitals.bloodPressureDiastolic} mmHg</div>
                  <div style={{ color: '#9b59b6', fontWeight: '600', marginTop: '2px' }}>
                    {getBloodPressureCategory(Number(watchedFields.vitals.bloodPressureSystolic), Number(watchedFields.vitals.bloodPressureDiastolic))}
                  </div>
                </div>
              )}
            </div>

            {/* Pulse Rate */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '1.1em' }}>💓 Pulse Rate</h4>
              <input
                type="number"
                {...register('vitals.pulseRate')}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                placeholder="72"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>beats per minute</div>
              {watchedFields.vitals.pulseRate && (
                <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '8px', color: Number(watchedFields.vitals.pulseRate) < 60 ? '#e74c3c' : Number(watchedFields.vitals.pulseRate) > 100 ? '#e74c3c' : '#27ae60' }}>
                  {Number(watchedFields.vitals.pulseRate) < 60 ? 'Bradycardia (Low)' : 
                   Number(watchedFields.vitals.pulseRate) > 100 ? 'Tachycardia (High)' : 'Normal'}
                </div>
              )}
            </div>

            {/* Temperature */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '1.1em' }}>🌡️ Temperature</h4>
              <input
                type="number"
                step="0.1"
                {...register('vitals.temperature')}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                placeholder="98.6"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>°F</div>
              {watchedFields.vitals.temperature && (
                <div style={{ fontSize: '12px', fontWeight: '600', marginTop: '8px', color: '#9b59b6' }}>
                  {getTemperatureCategory(Number(watchedFields.vitals.temperature))}
                </div>
              )}
            </div>

            {/* Height */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '12px', border: '1px solid #e9ecef' }}>
              <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '1.1em' }}>📏 Height</h4>
              <input
                type="number"
                step="0.1"
                {...register('vitals.height')}
                style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                placeholder="170"
              />
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>centimeters</div>
            </div>
          </div>

          {/* Sugar Levels */}
          <div style={{ marginTop: '25px' }}>
            <h4 style={{ color: '#495057', marginBottom: '15px', fontSize: '1.1em' }}>🍯 Blood Sugar Levels (mg/dL) - Optional</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Pre-meal</label>
                <input
                  type="number"
                  {...register('vitals.sugarLevel.preMeal')}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="100"
                />
              </div>
              
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Post-meal</label>
                <input
                  type="number"
                  {...register('vitals.sugarLevel.postMeal')}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="140"
                />
              </div>
              
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Fasting</label>
                <input
                  type="number"
                  {...register('vitals.sugarLevel.fastingGlucose')}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="90"
                />
              </div>
              
              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '6px' }}>Random</label>
                <input
                  type="number"
                  {...register('vitals.sugarLevel.randomGlucose')}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="120"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Medical Information */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #27ae60', paddingBottom: '10px' }}>
            🏥 Medical Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Chief Complaint</label>
              <textarea
                rows={3}
                {...register('chiefComplaint')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Main reason for the visit..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Present Illness History</label>
              <textarea
                rows={3}
                {...register('presentIllnessHistory')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="History of present illness..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Symptoms *</label>
              <textarea
                rows={4}
                {...register('symptoms', { 
                  required: 'Symptoms are required',
                  minLength: { value: 10, message: 'Please provide detailed symptoms' }
                })}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: `2px solid ${errors.symptoms ? '#e74c3c' : '#bdc3c7'}`, 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Describe the patient's symptoms in detail..."
              />
              {errors.symptoms && (
                <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.symptoms.message}</p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Physical Examination</label>
              <textarea
                rows={4}
                {...register('physicalExamination')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Physical examination findings..."
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Diagnosis</label>
              <textarea
                rows={3}
                {...register('diagnosis')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Enter your diagnosis..."
              />
            </div>
          </div>
        </div>

        {/* Medicine Section */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
            💊 Prescribed Medicines ({fields.length})
          </h3>
          
          {/* Add Medicine Form */}
          <div style={{ background: '#fff8e1', border: '2px dashed #ffb74d', borderRadius: '12px', padding: '25px', marginBottom: '25px' }}>
            <h4 style={{ color: '#e65100', marginBottom: '20px', fontSize: '1.2em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ➕ Add New Medicine
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Search Medicine *
                </label>
                <MedicineSearch
                  onMedicineSelect={handleMedicineSelect}
                  initialValue={currentMedicine.medicineName}
                  placeholder="Type to search medicines..."
                />
                {currentMedicine.composition && (
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                    <strong>Composition:</strong> {currentMedicine.composition}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Dosage *</label>
                <input
                  type="text"
                  value={currentMedicine.dosage}
                  onChange={(e) => setCurrentMedicine(prev => ({ ...prev, dosage: e.target.value }))}
                  placeholder="e.g., 500mg, 1 tablet"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid #bdc3c7', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    transition: 'border-color 0.3s ease'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Frequency *</label>
                <select
                  value={currentMedicine.frequency}
                  onChange={(e) => setCurrentMedicine(prev => ({ ...prev, frequency: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid #bdc3c7', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    backgroundColor: 'white',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <option value="">Select Frequency</option>
                  {MEDICINE_FREQUENCIES.map(freq => (
                    <option key={freq} value={freq}>{freq}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Duration *</label>
                <select
                  value={currentMedicine.duration}
                  onChange={(e) => setCurrentMedicine(prev => ({ ...prev, duration: e.target.value }))}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid #bdc3c7', 
                    borderRadius: '8px', 
                    fontSize: '16px',
                    backgroundColor: 'white',
                    transition: 'border-color 0.3s ease'
                  }}
                >
                  <option value="">Select Duration</option>
                  {COMMON_DURATIONS.map(duration => (
                    <option key={duration} value={duration}>{duration}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Instructions */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                Special Instructions (Optional)
              </label>
              <input
                type="text"
                value={currentMedicine.instructions}
                onChange={(e) => setCurrentMedicine(prev => ({ ...prev, instructions: e.target.value }))}
                placeholder="e.g., Take after meals, Avoid alcohol, Take with plenty of water..."
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </div>

            {/* Add Medicine Button */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={addMedicine}
                disabled={!currentMedicine.medicineName || !currentMedicine.dosage || !currentMedicine.frequency || !currentMedicine.duration}
                style={{ 
                  padding: '12px 24px', 
                  background: (!currentMedicine.medicineName || !currentMedicine.dosage || !currentMedicine.frequency || !currentMedicine.duration) ? '#bdc3c7' : 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: (!currentMedicine.medicineName || !currentMedicine.dosage || !currentMedicine.frequency || !currentMedicine.duration) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              >
                ➕ Add Medicine
              </button>
              <button
                type="button"
                onClick={() => setCurrentMedicine({
                  medicineId: '', medicineName: '', composition: '', dosage: '', frequency: '', duration: '', instructions: ''
                })}
                style={{ 
                  padding: '12px 20px', 
                  background: '#95a5a6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
                title="Clear form"
              >
                🗑️ Clear
              </button>
            </div>
          </div>

          {/* Medicine List */}
          {fields.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h4 style={{ color: '#2c3e50', fontSize: '1.2em', margin: 0 }}>Added Medicines:</h4>
              {fields.map((medicine, index) => (
                <div key={medicine.id} style={{ 
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '12px', 
                  padding: '20px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ 
                          background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)', 
                          color: 'white', 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          padding: '4px 12px', 
                          borderRadius: '12px' 
                        }}>
                          #{index + 1}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '18px', color: '#2c3e50' }}>{medicine.medicineName}</span>
                      </div>
                      {medicine.composition && (
                        <div style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '10px', fontStyle: 'italic' }}>
                          <strong>Composition:</strong> {medicine.composition}
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                          <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Dosage</div>
                          <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '600' }}>{medicine.dosage}</div>
                        </div>
                        <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                          <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Frequency</div>
                          <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '600' }}>{medicine.frequency}</div>
                        </div>
                        <div style={{ background: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                          <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Duration</div>
                          <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '600' }}>{medicine.duration}</div>
                        </div>
                      </div>
                      {medicine.instructions && (
                        <div style={{ 
                          background: '#fff3cd', 
                          border: '1px solid #ffeaa7', 
                          borderRadius: '6px', 
                          padding: '10px', 
                          marginTop: '10px' 
                        }}>
                          <div style={{ fontSize: '12px', color: '#856404', fontWeight: '600' }}>Special Instructions:</div>
                          <div style={{ fontSize: '14px', color: '#856404', marginTop: '4px' }}>{medicine.instructions}</div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      style={{ 
                        marginLeft: '15px', 
                        padding: '8px 12px', 
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '8px', 
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              background: '#f8f9fa', 
              borderRadius: '12px', 
              border: '2px dashed #dee2e6' 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>💊</div>
              <p style={{ fontSize: '18px', color: '#6c757d', margin: '0 0 8px 0' }}>No medicines added yet</p>
              <p style={{ fontSize: '14px', color: '#adb5bd', margin: 0 }}>Use the form above to add medicines to this prescription</p>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #95a5a6', paddingBottom: '10px' }}>
            📝 Additional Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Instructions</label>
              <textarea
                rows={3}
                {...register('instructions')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="General instructions for patient..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Follow-up Date</label>
              <input
                type="date"
                {...register('followUpDate')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  transition: 'border-color 0.3s ease'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Priority</label>
              <select
                {...register('priority')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px',
                  backgroundColor: 'white',
                  transition: 'border-color 0.3s ease'
                }}
              >
                <option value="normal">🟢 Normal</option>
                <option value="urgent">🟡 Urgent</option>
                <option value="emergency">🔴 Emergency</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>Additional Notes</label>
              <textarea
                rows={3}
                {...register('notes')}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #bdc3c7', 
                  borderRadius: '8px', 
                  fontSize: '16px', 
                  resize: 'vertical',
                  transition: 'border-color 0.3s ease'
                }}
                placeholder="Any additional notes, precautions, or follow-up instructions..."
              />
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '30px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: '600', fontSize: '16px' }}>
              {isEditMode ? 'Update Prescription' : 'Create Prescription'}
            </p>
            <p style={{ margin: 0 }}>Please review all information before {isEditMode ? 'updating' : 'creating'} the prescription.</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
              Progress: {Math.round(formProgress)}% • Medicines: {fields.length}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
                  // navigate('/dashboard');
                    if (onCancel) onCancel(); // <-- call the parent to switch tab
                }
              }}
              style={{ 
                padding: '15px 25px', 
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
              disabled={loading || fields.length === 0 || formProgress < 70}
              style={{ 
                padding: '15px 30px', 
                background: loading || fields.length === 0 || formProgress < 70 ? '#bdc3c7' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: loading || fields.length === 0 || formProgress < 70 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: loading || fields.length === 0 || formProgress < 70 ? 'none' : '0 4px 15px rgba(39, 174, 96, 0.3)'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff40', borderTop: '2px solid #ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </span>
              ) : fields.length === 0 ? (
                '❌ Add Medicines First'
              ) : formProgress < 70 ? (
                '📝 Complete Required Fields'
              ) : (
                `📝 ${isEditMode ? 'Update Prescription' : 'Create Prescription'}`
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Add CSS animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default EnhancedPrescriptionForm;