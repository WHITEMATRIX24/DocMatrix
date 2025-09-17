// src/components/Medicine/AddMedicine.tsx - Fixed with proper TypeScript types
import React, { useState, useEffect, MouseEvent } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { dynamoDBService } from '../../services/dynamoDBService';
import authenticatedApiService from '../../services/authenticatedApi';

// Enhanced Medicine interface with proper typing
interface MedicineFormData {
  medicineName: string;
  composition: string;
  category: string;
  manufacturer: string;
  dosageForm: string;
  strength: string;
  description: string;
  sideEffects?: string;
  whenToUse?: string;
  contraindications?: string;
  storageInstructions?: string;
  price?: number;
  stockQuantity?: number;
  expiryDate?: string;
}

interface ExistingMedicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  manufacturer: string;
  category: string;
  [key: string]: any; // Allow additional properties from different sources
}

interface DuplicateCheckState {
  checking: boolean;
  isDuplicate: boolean;
  similar: ExistingMedicine[];
}

// Constants
const MEDICINE_CATEGORIES = [
  'Antibiotic',
  'Analgesic',
  'Anti-inflammatory',
  'Antacid',
  'Antidiabetic',
  'Antihypertensive',
  'Antihistamine',
  'Antifungal',
  'Antiviral',
  'Cardiovascular',
  'Respiratory',
  'Neurological',
  'Dermatological',
  'Gastrointestinal',
  'Vitamin/Supplement',
  'Hormone',
  'Anticoagulant',
  'Diuretic',
  'Sedative',
  'Other'
] as const;

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Cream',
  'Ointment',
  'Drops',
  'Inhaler',
  'Suppository',
  'Powder',
  'Solution',
  'Suspension',
  'Gel',
  'Lotion',
  'Patch',
  'Spray'
] as const;

const MANUFACTURERS = [
  'Sun Pharma',
  'Cipla',
  'Dr. Reddy\'s',
  'Lupin',
  'Aurobindo Pharma',
  'Zydus Cadila',
  'Biocon',
  'Glenmark',
  'Torrent Pharma',
  'Alkem Labs',
  'Mankind Pharma',
  'Abbott',
  'Pfizer',
  'GSK',
  'Novartis',
  'Other'
] as const;

const AddMedicine: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [sideEffectsList, setSideEffectsList] = useState<string[]>([]);
  const [currentSideEffect, setCurrentSideEffect] = useState<string>('');
  const [existingMedicines, setExistingMedicines] = useState<ExistingMedicine[]>([]);
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckState>({
    checking: false,
    isDuplicate: false,
    similar: []
  });
  const [customManufacturer, setCustomManufacturer] = useState<string>('');
  const [showCustomManufacturer, setShowCustomManufacturer] = useState<boolean>(false);
  const [formProgress, setFormProgress] = useState<number>(0);

  const navigate = useNavigate();
  const { user, userProfile, isDynamoDBAvailable, isAuthenticated } = useAuth();

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<MedicineFormData>({
    defaultValues: {
      medicineName: '',
      composition: '',
      category: '',
      manufacturer: '',
      dosageForm: '',
      strength: '',
      description: '',
      sideEffects: '',
      whenToUse: '',
      contraindications: '',
      storageInstructions: '',
      price: 0,
      stockQuantity: 0,
      expiryDate: ''
    }
  });

  // Watch form fields for progress calculation
  const watchedFields = watch();

  // Calculate form completion progress
  useEffect(() => {
    const requiredFields: (keyof MedicineFormData)[] = [
      'medicineName', 'composition', 'category', 'manufacturer', 'dosageForm', 'strength', 'description'
    ];
    
    const completedFields = requiredFields.filter(field => {
      const value = watchedFields[field];
      return value && value.toString().trim();
    });
    
    const progress = (completedFields.length / requiredFields.length) * 100;
    setFormProgress(progress);
  }, [watchedFields]);

  // Load existing medicines for duplicate checking
  useEffect(() => {
    loadExistingMedicines();
  }, []);

  // Check for duplicates when medicine name changes
  useEffect(() => {
    if (watchedFields.medicineName && watchedFields.medicineName.length > 2) {
      checkForDuplicates(watchedFields.medicineName);
    } else {
      setDuplicateCheck({ checking: false, isDuplicate: false, similar: [] });
    }
  }, [watchedFields.medicineName, existingMedicines]);

  const loadExistingMedicines = async (): Promise<void> => {
    try {
      let medicines: any[] = [];
      
      if (isDynamoDBAvailable) {
        medicines = await dynamoDBService.getAllMedicines();
      } else {
        medicines = await authenticatedApiService.getMedicines().catch(() => []);
      }
      
      if (medicines.length === 0) {
        // Fallback to localStorage
        const localMedicines = localStorage.getItem('medicines');
        medicines = localMedicines ? JSON.parse(localMedicines) : [];
      }
      
      setExistingMedicines(medicines as ExistingMedicine[]);
    } catch (error) {
      console.error('Error loading existing medicines:', error);
      setExistingMedicines([]);
    }
  };

  // Type guard to check if an object has required medicine properties
  const isMedicineObject = (obj: any): obj is ExistingMedicine => {
    return obj && 
           typeof obj === 'object' && 
           (obj.medicineId || obj.id) &&
           (obj.medicineName || obj.name);
  };

  const checkForDuplicates = async (medicineName: string): Promise<void> => {
    setDuplicateCheck(prev => ({ ...prev, checking: true }));
    
    try {
      // Check exact match
      const exactMatch = existingMedicines.find(med => 
        med.medicineName && 
        med.medicineName.toLowerCase() === medicineName.toLowerCase()
      );
      
      // Check similar names (fuzzy matching)
      const similarMedicines = existingMedicines.filter(med => {
        if (!med.medicineName) return false;
        const similarity = calculateSimilarity(medicineName.toLowerCase(), med.medicineName.toLowerCase());
        return similarity > 0.7 && med.medicineName.toLowerCase() !== medicineName.toLowerCase();
      });

      setDuplicateCheck({
        checking: false,
        isDuplicate: !!exactMatch,
        similar: similarMedicines.slice(0, 3) // Show top 3 similar medicines
      });

    } catch (error) {
      console.error('Error checking duplicates:', error);
      setDuplicateCheck({ checking: false, isDuplicate: false, similar: [] });
    }
  };

  // Simple similarity calculation (Levenshtein distance)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len2][len1]) / maxLen;
  };

  const addSideEffect = (): void => {
    if (currentSideEffect.trim() && !sideEffectsList.includes(currentSideEffect.trim())) {
      setSideEffectsList(prev => [...prev, currentSideEffect.trim()]);
      setCurrentSideEffect('');
    }
  };

  const removeSideEffect = (sideEffect: string): void => {
    setSideEffectsList(prev => prev.filter(se => se !== sideEffect));
  };

  const onSubmit = async (data: MedicineFormData): Promise<void> => {
    // Check for duplicate before submitting
    if (duplicateCheck.isDuplicate) {
      toast.error('A medicine with this name already exists!');
      return;
    }

    setLoading(true);
    try {
      console.log('💊 Creating medicine with data:', data);

      // Prepare medicine data
      const medicineData = {
        ...data,
        sideEffects: sideEffectsList.join(', '),
        manufacturer: showCustomManufacturer ? customManufacturer : data.manufacturer,
        price: Number(data.price) || 0,
        stockQuantity: Number(data.stockQuantity) || 0,
        expiryDate: data.expiryDate || '',
        createdBy: userProfile?.UserId || user?.username || 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active'
      };

      console.log('📝 Final medicine data:', medicineData);

      let result: any;
      let savedSuccessfully = false;

      // Try DynamoDB first
      if (isDynamoDBAvailable) {
        try {
          result = await dynamoDBService.createMedicine(medicineData);
          savedSuccessfully = true;
          console.log('✅ Saved to DynamoDB:', result);
        } catch (dynamoError) {
          console.error('❌ DynamoDB save failed:', dynamoError);
          // Fall back to API
        }
      }

      // Try API if DynamoDB failed or not available
      if (!savedSuccessfully) {
        try {
          result = await authenticatedApiService.createMedicine(medicineData);
          savedSuccessfully = true;
          console.log('✅ Saved via API:', result);
        } catch (apiError) {
          console.error('❌ API save failed:', apiError);
        }
      }

      // If both cloud methods failed, save to localStorage
      if (!savedSuccessfully) {
        const medicineWithId = {
          ...medicineData,
          medicineId: `MED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        const existingMedicines = JSON.parse(localStorage.getItem('medicines') || '[]');
        const updatedMedicines = [...existingMedicines, medicineWithId];
        localStorage.setItem('medicines', JSON.stringify(updatedMedicines));
        
        console.log('✅ Saved to localStorage as fallback');
        toast.success('Medicine added successfully (saved locally - will sync when online)!');
      } else {
        // Also update localStorage cache for successful cloud saves
        try {
          const existingMedicines = JSON.parse(localStorage.getItem('medicines') || '[]');
          const updatedMedicines = [...existingMedicines, result];
          localStorage.setItem('medicines', JSON.stringify(updatedMedicines));
          console.log('✅ Updated localStorage cache');
        } catch (localStorageError) {
          console.warn('⚠️ Could not update localStorage cache:', localStorageError);
        }

        toast.success('Medicine added successfully and saved to cloud database!');
      }

      // Reset form and state
      reset();
      setSideEffectsList([]);
      setCustomManufacturer('');
      setShowCustomManufacturer(false);
      setDuplicateCheck({ checking: false, isDuplicate: false, similar: [] });
      
      // Reload existing medicines list
      await loadExistingMedicines();
      
      navigate('/dashboard');

    } catch (error: any) {
      console.error('❌ Error creating medicine:', error);
      
      if (error.message.includes('Authentication') || error.message.includes('token')) {
        toast.error('Authentication expired. Please refresh the page.');
      } else if (error.message.includes('403')) {
        toast.error('Access denied. Please check your permissions.');
      } else if (error.message.includes('Network')) {
        toast.error('Network error. Please check your internet connection.');
      } else {
        toast.error(error.message || 'Error adding medicine. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Event handlers with proper typing
  const handleMouseEnter = (callback: (target: HTMLElement) => void) => 
    (e: MouseEvent<HTMLButtonElement>) => callback(e.currentTarget);

  const handleMouseLeave = (callback: (target: HTMLElement) => void) => 
    (e: MouseEvent<HTMLButtonElement>) => callback(e.currentTarget);

  const renderProgressBar = (): JSX.Element => (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>Form Completion</span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: formProgress === 100 ? '#27ae60' : '#f39c12' }}>
          {Math.round(formProgress)}%
        </span>
      </div>
      <div style={{ width: '100%', height: '8px', backgroundColor: '#ecf0f1', borderRadius: '4px', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${formProgress}%`, 
            height: '100%', 
            backgroundColor: formProgress === 100 ? '#27ae60' : '#f39c12',
            transition: 'all 0.3s ease',
            borderRadius: '4px'
          }} 
        />
      </div>
    </div>
  );

  const renderDuplicateAlert = (): JSX.Element | null => {
    if (duplicateCheck.checking) {
      return (
        <div style={{ background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '6px', padding: '12px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', border: '2px solid #f39c12', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: '#856404', fontSize: '14px' }}>Checking for duplicate medicines...</span>
          </div>
        </div>
      );
    }

    if (duplicateCheck.isDuplicate) {
      return (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', padding: '12px', marginBottom: '15px' }}>
          <div style={{ color: '#721c24', fontSize: '14px', fontWeight: '600' }}>
            ⚠️ A medicine with this name already exists!
          </div>
          <div style={{ color: '#721c24', fontSize: '12px', marginTop: '4px' }}>
            Please choose a different name or check if you meant to update an existing medicine.
          </div>
        </div>
      );
    }

    if (duplicateCheck.similar.length > 0) {
      return (
        <div style={{ background: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '6px', padding: '12px', marginBottom: '15px' }}>
          <div style={{ color: '#0c5460', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            💡 Similar medicines found:
          </div>
          {duplicateCheck.similar.map((med, index) => (
            <div key={index} style={{ color: '#0c5460', fontSize: '12px', marginBottom: '4px' }}>
              • {med.medicineName} ({med.manufacturer})
            </div>
          ))}
          <div style={{ color: '#0c5460', fontSize: '12px', marginTop: '8px', fontStyle: 'italic' }}>
            Make sure this is a different medicine before proceeding.
          </div>
        </div>
      );
    }

    return null;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2>Please log in to add medicines</h2>
        <button 
          onClick={() => navigate('/login')} 
          style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>💊 Add New Medicine</h1>
              <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1em' }}>Add medicines to your database with comprehensive details</p>
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
              onMouseEnter={handleMouseEnter((target) => {
                target.style.background = 'rgba(255,255,255,0.3)';
                target.style.borderColor = 'rgba(255,255,255,0.5)';
              })}
              onMouseLeave={handleMouseLeave((target) => {
                target.style.background = 'rgba(255,255,255,0.2)';
                target.style.borderColor = 'rgba(255,255,255,0.3)';
              })}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        <div style={{ padding: '30px' }}>
          {/* Progress Bar */}
          {renderProgressBar()}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Basic Medicine Information */}
            <div style={{ background: '#e8f5e8', border: '1px solid #c3e6c3', borderRadius: '12px', padding: '25px' }}>
              <h3 style={{ color: '#155724', marginBottom: '20px', fontSize: '1.4em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                💊 Basic Medicine Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Medicine Name *
                  </label>
                  <input
                    {...register('medicineName', { 
                      required: 'Medicine name is required',
                      minLength: { value: 2, message: 'Medicine name must be at least 2 characters' }
                    })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: `2px solid ${errors.medicineName ? '#e74c3c' : duplicateCheck.isDuplicate ? '#e74c3c' : '#bdc3c7'}`, 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Enter medicine name (e.g., Paracetamol)"
                  />
                  {errors.medicineName && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.medicineName.message}</p>
                  )}
                  {renderDuplicateAlert()}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Composition *
                  </label>
                  <input
                    {...register('composition', { 
                      required: 'Composition is required',
                      minLength: { value: 5, message: 'Composition must be at least 5 characters' }
                    })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: `2px solid ${errors.composition ? '#e74c3c' : '#bdc3c7'}`, 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="e.g., Paracetamol 500mg + Caffeine 65mg"
                  />
                  {errors.composition && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.composition.message}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Category *
                  </label>
                  <select
                    {...register('category', { required: 'Category is required' })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: `2px solid ${errors.category ? '#e74c3c' : '#bdc3c7'}`, 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      backgroundColor: 'white',
                      transition: 'border-color 0.3s ease'
                    }}
                  >
                    <option value="">Select Category</option>
                    {MEDICINE_CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Manufacturer *
                  </label>
                  {!showCustomManufacturer ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        {...register('manufacturer', { required: !showCustomManufacturer ? 'Manufacturer is required' : false })}
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          border: `2px solid ${errors.manufacturer ? '#e74c3c' : '#bdc3c7'}`, 
                          borderRadius: '8px', 
                          fontSize: '16px',
                          backgroundColor: 'white',
                          transition: 'border-color 0.3s ease'
                        }}
                      >
                        <option value="">Select Manufacturer</option>
                        {MANUFACTURERS.map(manufacturer => (
                          <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCustomManufacturer(true)}
                        style={{ 
                          padding: '12px', 
                          background: '#3498db', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Add custom manufacturer"
                      >
                        ✏️
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={customManufacturer}
                        onChange={(e) => setCustomManufacturer(e.target.value)}
                        placeholder="Enter custom manufacturer"
                        style={{ 
                          flex: 1, 
                          padding: '12px', 
                          border: '2px solid #bdc3c7', 
                          borderRadius: '8px', 
                          fontSize: '16px',
                          transition: 'border-color 0.3s ease'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomManufacturer(false);
                          setCustomManufacturer('');
                        }}
                        style={{ 
                          padding: '12px', 
                          background: '#e74c3c', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '8px', 
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                        title="Cancel custom manufacturer"
                      >
                        ❌
                      </button>
                    </div>
                  )}
                  {errors.manufacturer && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.manufacturer.message}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Dosage Form *
                  </label>
                  <select
                    {...register('dosageForm', { required: 'Dosage form is required' })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: `2px solid ${errors.dosageForm ? '#e74c3c' : '#bdc3c7'}`, 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      backgroundColor: 'white',
                      transition: 'border-color 0.3s ease'
                    }}
                  >
                    <option value="">Select Dosage Form</option>
                    {DOSAGE_FORMS.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                  {errors.dosageForm && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.dosageForm.message}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Strength *
                  </label>
                  <input
                    {...register('strength', {
                      required: 'Strength is required',
                      minLength: { value: 2, message: 'Strength must be at least 2 characters' }
                    })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: `2px solid ${errors.strength ? '#e74c3c' : '#bdc3c7'}`, 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="e.g., 500mg, 10ml, 5%"
                  />
                  {errors.strength && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.strength.message}</p>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Description *
                </label>
                <textarea
                  {...register('description', { 
                    required: 'Description is required',
                    minLength: { value: 10, message: 'Description must be at least 10 characters' }
                  })}
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: `2px solid ${errors.description ? '#e74c3c' : '#bdc3c7'}`, 
                    borderRadius: '8px', 
                    fontSize: '16px', 
                    resize: 'vertical',
                    transition: 'border-color 0.3s ease'
                  }}
                  placeholder="Enter detailed description of the medicine, its primary uses, and key information"
                />
                {errors.description && (
                  <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Inventory & Pricing */}
            <div style={{ background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '12px', padding: '25px' }}>
              <h3 style={{ color: '#1565c0', marginBottom: '20px', fontSize: '1.4em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📦 Inventory & Pricing
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { min: { value: 0, message: 'Price cannot be negative' } })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #bdc3c7', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.price.message}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    {...register('stockQuantity', { min: { value: 0, message: 'Stock cannot be negative' } })}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #bdc3c7', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="0"
                  />
                  {errors.stockQuantity && (
                    <p style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>{errors.stockQuantity.message}</p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    {...register('expiryDate')}
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
              </div>
            </div>

            {/* Usage Information */}
            <div style={{ background: '#fff3e0', border: '1px solid #ffcc02', borderRadius: '12px', padding: '25px' }}>
              <h3 style={{ color: '#e65100', marginBottom: '20px', fontSize: '1.4em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                📋 Usage Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    When to Use
                  </label>
                  <textarea
                    {...register('whenToUse')}
                    rows={3}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #bdc3c7', 
                      borderRadius: '8px', 
                      fontSize: '16px', 
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Describe when this medicine should be used (conditions, symptoms, etc.)"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Contraindications
                  </label>
                  <textarea
                    {...register('contraindications')}
                    rows={3}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #bdc3c7', 
                      borderRadius: '8px', 
                      fontSize: '16px', 
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="When should this medicine NOT be used (allergies, conditions, drug interactions, etc.)"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Storage Instructions
                  </label>
                  <textarea
                    {...register('storageInstructions')}
                    rows={2}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid #bdc3c7', 
                      borderRadius: '8px', 
                      fontSize: '16px', 
                      resize: 'vertical',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="How to store this medicine properly (temperature, humidity, light exposure, etc.)"
                  />
                </div>
              </div>
            </div>

            {/* Side Effects */}
            <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', borderRadius: '12px', padding: '25px' }}>
              <h3 style={{ color: '#c62828', marginBottom: '20px', fontSize: '1.4em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚠️ Side Effects
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  Add Side Effects
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={currentSideEffect}
                    onChange={(e) => setCurrentSideEffect(e.target.value)}
                    style={{ 
                      flex: 1, 
                      padding: '12px', 
                      border: '2px solid #bdc3c7', 
                      borderRadius: '8px', 
                      fontSize: '16px',
                      transition: 'border-color 0.3s ease'
                    }}
                    placeholder="Enter a side effect (e.g., Nausea, Dizziness)"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSideEffect())}
                  />
                  <button
                    type="button"
                    onClick={addSideEffect}
                    style={{ 
                      padding: '12px 20px', 
                      background: '#e74c3c', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'background-color 0.3s ease'
                    }}
                    onMouseEnter={handleMouseEnter((target) => {
                      target.style.backgroundColor = '#c0392b';
                    })}
                    onMouseLeave={handleMouseLeave((target) => {
                      target.style.backgroundColor = '#e74c3c';
                    })}
                  >
                    Add
                  </button>
                </div>
              </div>

              {sideEffectsList.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    Listed Side Effects ({sideEffectsList.length})
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {sideEffectsList.map((sideEffect, index) => (
                      <span
                        key={index}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          background: '#ffcdd2',
                          color: '#c62828',
                          border: '1px solid #ef9a9a'
                        }}
                      >
                        {sideEffect}
                        <button
                          type="button"
                          onClick={() => removeSideEffect(sideEffect)}
                          style={{
                            marginLeft: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#c62828',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '0',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remove side effect"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '25px', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #dee2e6' }}>
              <div style={{ fontSize: '14px', color: '#666' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: '600' }}>Ready to add this medicine?</p>
                <p style={{ margin: 0 }}>Please review all information before adding to the database.</p>
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel? All data will be lost.')) {
                      navigate('/dashboard');
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
                  onMouseEnter={handleMouseEnter((target) => {
                    target.style.background = '#6c757d';
                    target.style.color = 'white';
                  })}
                  onMouseLeave={handleMouseLeave((target) => {
                    target.style.background = 'white';
                    target.style.color = '#6c757d';
                  })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || duplicateCheck.isDuplicate || formProgress < 100}
                  style={{ 
                    padding: '15px 30px', 
                    background: loading || duplicateCheck.isDuplicate || formProgress < 100 ? '#bdc3c7' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    cursor: loading || duplicateCheck.isDuplicate || formProgress < 100 ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: loading || duplicateCheck.isDuplicate || formProgress < 100 ? 'none' : '0 4px 15px rgba(39, 174, 96, 0.3)'
                  }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #ffffff40', borderTop: '2px solid #ffffff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Adding Medicine...
                    </span>
                  ) : duplicateCheck.isDuplicate ? (
                    '❌ Duplicate Medicine'
                  ) : formProgress < 100 ? (
                    '📝 Complete Required Fields'
                  ) : (
                    '💊 Add Medicine to Database'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

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

export default AddMedicine;