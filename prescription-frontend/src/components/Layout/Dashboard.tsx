// src/components/Layout/Dashboard.tsx - Enhanced Professional Dashboard
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { dynamoDBService } from '../../services/dynamoDBService';
import { Prescription, PrescriptionMedicine } from '../../types';

// Extend React CSSProperties for webkit properties
declare module 'react' {
  interface CSSProperties {
    WebkitBackgroundClip?: string;
    WebkitTextFillColor?: string;
  }
}

// Enhanced TypeScript interfaces
interface PatientDetails {
  patientId?: string;
  name?: string;
  age: number;
  bloodGroup: string;
  weight: number;
  phone?: string;
  address?: string;
  gender?: string;
}

interface PrescriptionMedicineWithComposition {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  composition?: string;
  instructions?: string;
  medicineId?: string;
}

interface EnhancedPrescription {
  prescriptionId: string;
  patientDetails?: PatientDetails;
  createdAt: string;
  updatedAt?: string;
  status: string;
  medicines: PrescriptionMedicineWithComposition[];
  doctorName?: string;
  doctorId?: string;
  symptoms?: string;
  diagnosis?: string;
  dispensed?: boolean;
  priority?: 'normal' | 'urgent' | 'emergency';
  vitals?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    pulseRate?: number;
    temperature?: number;
    height?: number;
    sugarLevel?: {
      preMeal?: number;
      postMeal?: number;
      fastingGlucose?: number;
      randomGlucose?: number;
    };
  };
  instructions?: string;
  notes?: string;
  followUpDate?: string;
  chiefComplaint?: string;
  presentIllnessHistory?: string;
  physicalExamination?: string;
  prescriptionDate?: string;
}

interface Medicine {
  id: string;
  medicineId?: string;
  name: string;
  medicineName?: string;
  stockQuantity: number;
  composition?: string;
  manufacturer?: string;
  expiryDate?: string;
  category?: string;
  dosageForm?: string;
  strength?: string;
  price?: number;
}

interface DashboardStats {
  totalMedicines: number;
  totalPatients: number;
  totalPrescriptions: number;
  todayPrescriptions: number;
  pendingPrescriptions: number;
  lowStockMedicines: number;
}

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  bgColor: string;
  action?: () => void;
}

// Helper function to format sugar level objects
const formatSugarLevelObject = (sugarLevel: {
  preMeal?: number;
  postMeal?: number;
  fastingGlucose?: number;
  randomGlucose?: number;
}) => {
  const measurements = Object.entries(sugarLevel)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const labels = {
        preMeal: 'Pre-meal',
        postMeal: 'Post-meal',
        fastingGlucose: 'Fasting',
        randomGlucose: 'Random'
      };
      return `${labels[key as keyof typeof labels]}: ${value} mg/dL`;
    });

  return measurements.length > 0 ? measurements.join(', ') : 'Not recorded';
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, isAuthenticated } = useAuth();

  // Enhanced state management
  const [activeSection, setActiveSection] = useState<'overview' | 'prescriptions' | 'patients' | 'medicines' | 'prescriptionSearch' | 'createPrescription' | 'viewPrescriptions' | 'patientManagement' | 'addPatient'>('overview');
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Prescription search state
  const [prescriptionId, setPrescriptionId] = useState('');
  const [foundPrescription, setFoundPrescription] = useState<EnhancedPrescription | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  const [allPrescriptions, setAllPrescriptions] = useState<EnhancedPrescription[]>([]);

  // Data state
  const [patients, setPatients] = useState<PatientDetails[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalMedicines: 0,
    totalPatients: 0,
    totalPrescriptions: 0,
    todayPrescriptions: 0,
    pendingPrescriptions: 0,
    lowStockMedicines: 0
  });

  // Connection state
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectionDetails, setConnectionDetails] = useState<string>('');
  const [showDynamoDBConfig, setShowDynamoDBConfig] = useState<boolean>(false);

  // Create prescription form state
  const [newPrescription, setNewPrescription] = useState({
    patientName: '',
    patientAge: '',
    patientBloodGroup: '',
    patientWeight: '',
    patientPhone: '',
    patientAddress: '',
    symptoms: '',
    diagnosis: '',
    chiefComplaint: '',
    presentIllnessHistory: '',
    physicalExamination: '',
    instructions: '',
    notes: '',
    followUpDate: '',
    priority: 'normal' as 'normal' | 'urgent' | 'emergency',
    medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
    vitals: {
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      pulseRate: '',
      temperature: '',
      height: '',
      sugarLevel: {
        preMeal: '',
        postMeal: '',
        fastingGlucose: '',
        randomGlucose: ''
      }
    }
  });

  // Enhanced module definitions
  const modules: ModuleCard[] = [
    {
      id: 'prescriptions',
      title: 'Prescriptions',
      description: 'Create, manage, and track all prescriptions with enhanced vitals',
      icon: '📋',
      route: '/prescriptions',
      color: '#875A7B',
      bgColor: '#F8F4F9',
      // action: () => setActiveSection('prescriptions')
      action: () => navigate('/prescriptions') // 🔥
    },
    {
      id: 'patients',
      title: 'Patients',
      description: 'Comprehensive patient records and medical history management',
      icon: '👥',
      route: '/patients',
      color: '#00A09D',
      bgColor: '#F0F9F9',
      action: () => setActiveSection('patientManagement')
    },
    {
      id: 'medicines',
      title: 'Medicines',
      description: 'Advanced medicine inventory with composition and stock tracking',
      icon: '💊',
      route: '/medicines',
      color: '#017E84',
      bgColor: '#F0F8F8',
      action: () => navigate('/medicines') // 🔥
    },
    {
      id: 'search',
      title: 'Search Engine',
      description: 'Powerful prescription search with professional printing',
      icon: '🔍',
      route: '#search',
      color: '#6C5CE7',
      bgColor: '#F7F6FF',
      action: () => setActiveSection('prescriptionSearch')
      // action: () => navigate('/prescriptionSearch') // 🔥
    },
    {
      id: 'vitals',
      title: 'Vitals Tracker',
      description: 'Monitor comprehensive patient vitals and health metrics',
      icon: '🩺',
      route: '/vitalstracker',
      color: '#FD79A8',
      bgColor: '#FFF5F8',
      // action: () => toast.info('Vitals Tracker - Coming Soon!')
        action: () => navigate('/vitalstracker') // 🔥
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      description: 'Generate detailed medical reports and practice insights',
      icon: '📊',
      route: '/reports-analytics',
      color: '#FDCB6E',
      bgColor: '#FFFBF5',
      // action: () => toast.info('Reports & Analytics - Coming Soon!')
        action: () => navigate('/reports-analytics') // 🔥
    },
    {
      id: 'appointments',
      title: 'Appointments',
      description: 'Schedule and manage patient appointments efficiently',
      icon: '📅',
      route: '/appointments',
      color: '#A29BFE',
      bgColor: '#F8F7FF',
      // action: () => toast.info('Appointments - Coming Soon!')
      action: () => navigate('/appointments') // 🔥
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'System configuration and practice preferences',
      icon: '⚙️',
      route: '/settings',
      color: '#636E72',
      bgColor: '#F8F9FA',
      action: () => setShowDynamoDBConfig(true)
    }
  ];

  const doctorName = userProfile?.name || user?.username || 'Doctor';

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load data on component mount
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated]);

  const loadAllData = async (): Promise<void> => {
    setLoading(true);
    setConnectionStatus('connecting');
    setErrorMessage('');
    setConnectionDetails('');

    try {
      console.log('🔄 Loading dashboard data from DynamoDB...');
      await loadFromDynamoDB();
      setConnectionStatus('connected');
      console.log('✅ Successfully connected to DynamoDB');
    } catch (error: any) {
      console.error('❌ Failed to load from DynamoDB:', error);
      setConnectionStatus('error');

      let userFriendlyMessage = error.message;

      if (error.message?.includes('Identity Pool')) {
        userFriendlyMessage = 'Cognito Identity Pool not configured. Please check VITE_IDENTITY_POOL_ID in .env';
      } else if (error.message?.includes('ResourceNotFoundException')) {
        userFriendlyMessage = 'DynamoDB tables not found. Please ensure tables are created.';
      } else if (error.message?.includes('AccessDeniedException')) {
        userFriendlyMessage = 'Access denied to DynamoDB. Please check IAM permissions.';
      } else if (error.message?.includes('UnrecognizedClientException')) {
        userFriendlyMessage = 'Invalid AWS credentials. Please check your configuration.';
      } else if (error.message?.includes('NetworkingError')) {
        userFriendlyMessage = 'Network error connecting to DynamoDB. Check your internet connection.';
      }

      setErrorMessage(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadFromDynamoDB = async (): Promise<void> => {
    try {
      console.log('📥 Loading data from DynamoDB tables...');

      const [prescriptionsData, patientsData, medicinesData] = await Promise.allSettled([
        dynamoDBService.getAllPrescriptions(),
        dynamoDBService.getAllPatients(),
        dynamoDBService.getAllMedicines()
      ]);

      const prescriptions = prescriptionsData.status === 'fulfilled' ? prescriptionsData.value : [];
      if (prescriptionsData.status === 'rejected') {
        console.warn('⚠️ Failed to load prescriptions:', prescriptionsData.reason);
      }

      const patientsResult = patientsData.status === 'fulfilled' ? patientsData.value : [];
      if (patientsData.status === 'rejected') {
        console.warn('⚠️ Failed to load patients:', patientsData.reason);
      }

      const medicinesResult = medicinesData.status === 'fulfilled' ? medicinesData.value : [];
      if (medicinesData.status === 'rejected') {
        console.warn('⚠️ Failed to load medicines:', medicinesData.reason);
      }

      setAllPrescriptions(prescriptions as EnhancedPrescription[]);
      setPatients(patientsResult as PatientDetails[]);
      setMedicines(medicinesResult);

      calculateStats(prescriptions, patientsResult, medicinesResult);

      console.log('✅ Successfully loaded from DynamoDB');
      console.log(`📊 Loaded: ${prescriptions.length} prescriptions, ${patientsResult.length} patients, ${medicinesResult.length} medicines`);

    } catch (error: any) {
      console.error('❌ DynamoDB load failed:', error);
      throw error;
    }
  };

  const calculateStats = (prescriptions: any[], patients: any[], medicines: any[]): void => {
    const today = new Date().toISOString().split('T')[0];
    const todayPrescriptions = prescriptions.filter(p =>
      p.createdAt?.startsWith(today) || p.prescriptionDate?.startsWith(today)
    );

    const pendingPrescriptions = prescriptions.filter(p =>
      p.status === 'active' && !p.dispensed
    );

    const lowStockMedicines = medicines.filter(m =>
      m.stockQuantity !== undefined && m.stockQuantity < 10
    );

    setDashboardStats({
      totalMedicines: medicines.length,
      totalPatients: patients.length,
      totalPrescriptions: prescriptions.length,
      todayPrescriptions: todayPrescriptions.length,
      pendingPrescriptions: pendingPrescriptions.length,
      lowStockMedicines: lowStockMedicines.length
    });
  };

  const searchPrescriptionById = async (): Promise<void> => {
    if (!prescriptionId.trim()) {
      toast.error('Please enter a prescription ID');
      return;
    }

    setPrescriptionLoading(true);
    try {
      let found: EnhancedPrescription | null = allPrescriptions.find((p: EnhancedPrescription) =>
        p.prescriptionId.toLowerCase().includes(prescriptionId.toLowerCase())
      ) || null;

      if (!found) {
        try {
          const dynamoResult = await dynamoDBService.getPrescription(prescriptionId);
          found = dynamoResult || null;
        } catch (error) {
          console.warn('Direct DynamoDB search failed:', error);
        }
      }

      if (found) {
        setFoundPrescription(found);
        toast.success('Prescription found!');
      } else {
        toast.error('Prescription not found');
        setFoundPrescription(null);
      }
    } catch (error: any) {
      console.error('Search prescription error:', error);
      toast.error(`Prescription search failed: ${error.message}`);
      setFoundPrescription(null);
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const printPrescription = async (prescription: EnhancedPrescription): Promise<void> => {
    try {
      const patientName = prescription.patientDetails?.name || 'Unknown Patient';
      const patientAge = prescription.patientDetails?.age || 'N/A';
      const patientBloodGroup = prescription.patientDetails?.bloodGroup || 'N/A';
      const patientWeight = prescription.patientDetails?.weight || 'N/A';
      const patientPhone = prescription.patientDetails?.phone || '';
      const doctorName = prescription.doctorName || prescription.doctorId || 'Doctor';

      const formatDate = (date?: string) => {
        if (!date) return new Date().toLocaleDateString('en-GB');
        return new Date(date).toLocaleDateString('en-GB');
      };

      const formatBloodPressure = (systolic?: number | string, diastolic?: number | string) => {
        if (!systolic || !diastolic) return null;
        return `${systolic}/${diastolic}`;
      };

      // Enhanced print template with comprehensive vitals display
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Professional Prescription - ${prescription.prescriptionId}</title>
            <style>
              @page { size: A4; margin: 10mm; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Times New Roman', serif; 
                font-size: 10px; 
                line-height: 1.2; 
                color: #000; 
                background: white;
              }
              .prescription-container { 
                width: 100%; 
                max-width: 190mm; 
                margin: 0 auto; 
                background: white; 
                padding: 0;
              }
              .clinic-header { 
                text-align: center; 
                border-bottom: 2px solid #2c3e50; 
                padding-bottom: 8px; 
                margin-bottom: 12px; 
              }
              .clinic-name { 
                font-size: 20px; 
                font-weight: bold; 
                color: #2c3e50; 
                margin-bottom: 4px;
                letter-spacing: 1px;
              }
              .clinic-address { 
                font-size: 9px; 
                color: #555; 
                margin-bottom: 1px; 
              }
              .clinic-contact { 
                font-size: 8px; 
                color: #666; 
                margin-top: 3px;
              }
              .rx-symbol {
                float: left;
                font-size: 28px;
                font-weight: bold;
                color: #2c3e50;
                margin-right: 12px;
                margin-top: -3px;
              }
              .patient-info { 
                background: #f8f9fa; 
                padding: 8px 12px; 
                border-radius: 5px; 
                margin-bottom: 10px;
                border-left: 3px solid #3498db;
                font-size: 9px;
              }
              .patient-row { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 3px; 
              }
              .patient-row:last-child { 
                margin-bottom: 0; 
              }
              .patient-label { 
                font-weight: bold; 
                color: #2c3e50; 
                min-width: 70px;
              }
              .patient-value { 
                color: #333; 
                font-weight: 600;
              }
              .prescription-date {
                text-align: right;
                font-size: 9px;
                color: #666;
                margin-bottom: 8px;
                font-weight: bold;
              }
              .vitals-section { 
                background: #f0f8ff; 
                padding: 8px; 
                border-radius: 4px; 
                margin-bottom: 12px;
                border: 1px solid #2196f3;
              }
              .vitals-title { 
                font-weight: bold; 
                color: #1976d2; 
                margin-bottom: 8px;
                font-size: 11px;
                text-align: center;
                text-transform: uppercase;
              }
              .vitals-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); 
                gap: 6px; 
              }
              .vital-item { 
                display: flex; 
                justify-content: space-between;
                padding: 4px 6px; 
                background: white; 
                border-radius: 3px;
                border: 1px solid #e0e0e0;
                font-size: 8px;
              }
              .vital-label { 
                font-weight: bold; 
                color: #1976d2; 
              }
              .vital-value { 
                color: #333; 
                font-weight: bold;
              }
              .medicines-section { 
                border: 2px solid #2c3e50; 
                border-radius: 6px; 
                margin: 12px 0; 
                background: white; 
              }
              .medicines-header { 
                background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); 
                color: white; 
                padding: 8px 12px; 
                font-weight: bold; 
                font-size: 11px;
                text-align: center;
              }
              .medicine-list { 
                padding: 10px; 
              }
              .medicine-item { 
                display: flex; 
                align-items: flex-start; 
                margin-bottom: 10px; 
                padding-bottom: 8px; 
                border-bottom: 1px dotted #bdc3c7; 
              }
              .medicine-item:last-child { 
                border-bottom: none; 
                margin-bottom: 0; 
              }
              .medicine-number { 
                background: #3498db; 
                color: white; 
                width: 20px; 
                height: 20px; 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 9px; 
                font-weight: bold; 
                margin-right: 10px; 
                flex-shrink: 0;
              }
              .medicine-details { 
                flex: 1; 
              }
              .medicine-name { 
                font-size: 11px; 
                font-weight: bold; 
                color: #2c3e50; 
                margin-bottom: 3px; 
              }
              .medicine-composition { 
                font-size: 8px; 
                color: #7f8c8d; 
                font-style: italic; 
                margin-bottom: 4px; 
              }
              .medicine-dosage { 
                font-size: 9px; 
                color: #333; 
                margin-bottom: 3px;
                font-weight: 600;
              }
              .medicine-instructions { 
                font-size: 8px; 
                color: #e67e22; 
                background: #fef9e7; 
                padding: 3px 5px; 
                border-radius: 2px; 
                margin-top: 3px;
                border-left: 2px solid #f39c12;
              }
              .medicine-frequency { 
                text-align: right; 
                font-size: 9px; 
                font-weight: bold; 
                color: #27ae60; 
                min-width: 90px; 
                padding-left: 10px;
              }
              .prescription-footer { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-end; 
                margin-top: 15px; 
                padding-top: 8px; 
                border-top: 2px solid #2c3e50; 
              }
              .doctor-name { 
                font-size: 12px; 
                font-weight: bold; 
                color: #2c3e50; 
                margin-bottom: 3px;
                border-bottom: 1px solid #2c3e50;
                padding-bottom: 2px;
              }
              @media print { 
                body { 
                  font-size: 11px; 
                  margin: 0; 
                  padding: 0; 
                } 
                .prescription-container { 
                  max-width: none; 
                  width: 100%; 
                }
                .no-print { 
                  display: none !important; 
                }
              }
            </style>
          </head>
          <body>
            <div class="prescription-container">
              <!-- Professional Clinic Header -->
              <div class="clinic-header">
                <div class="clinic-name">DOCNEST MEDICAL CENTER</div>
                <div class="clinic-address">Building No. 15, 2nd Floor, Tech Park Plaza</div>
                <div class="clinic-address">Whitefield Main Road, EPIP Zone</div>
                <div class="clinic-address">Bangalore - 560066, Karnataka</div>
                <div class="clinic-contact">
                  📞 +91-9876543210 | 📧 care@docnest.com | 🌐 www.docnest.com
                </div>
              </div>

              <!-- Prescription Date -->
              <div class="prescription-date">
                📅 Date: ${formatDate(prescription.prescriptionDate || prescription.createdAt)}
              </div>

              <!-- RX Symbol and Patient Info -->
              <div style="position: relative; margin-bottom: 15px;">
                <div class="rx-symbol">℞</div>
                <div class="patient-info">
                  <div class="patient-row">
                    <div>
                      <span class="patient-label">Patient:</span>
                      <span class="patient-value">${patientName}</span>
                    </div>
                    <div>
                      <span class="patient-label">Age/Gender:</span>
                      <span class="patient-value">${patientAge}Y / ${prescription.patientDetails?.gender || 'M'}</span>
                    </div>
                  </div>
                  <div class="patient-row">
                    <div>
                      <span class="patient-label">Address:</span>
                      <span class="patient-value">${prescription.patientDetails?.address || 'Not provided'}</span>
                    </div>
                    <div>
                      <span class="patient-label">Phone:</span>
                      <span class="patient-value">${patientPhone || 'Not provided'}</span>
                    </div>
                  </div>
                  <div class="patient-row">
                    <div>
                      <span class="patient-label">Weight:</span>
                      <span class="patient-value">${patientWeight} kg</span>
                    </div>
                    ${patientBloodGroup !== 'N/A' ? `
                    <div>
                      <span class="patient-label">Blood Group:</span>
                      <span class="patient-value">${patientBloodGroup}</span>
                    </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Enhanced Vitals Section -->
              ${(prescription.vitals?.bloodPressureSystolic || prescription.vitals?.pulseRate || prescription.vitals?.temperature ||
          prescription.vitals?.height || prescription.vitals?.sugarLevel?.preMeal || prescription.vitals?.sugarLevel?.postMeal ||
          prescription.vitals?.sugarLevel?.fastingGlucose || prescription.vitals?.sugarLevel?.randomGlucose) ? `
              <div class="vitals-section">
                <div class="vitals-title">🩺 VITAL SIGNS & MEASUREMENTS</div>
                <div class="vitals-grid">
                  ${prescription.vitals?.bloodPressureSystolic && prescription.vitals?.bloodPressureDiastolic ? `
                  <div class="vital-item">
                    <span class="vital-label">BP</span>
                    <span class="vital-value">${formatBloodPressure(prescription.vitals.bloodPressureSystolic, prescription.vitals.bloodPressureDiastolic)} mmHg</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.pulseRate ? `
                  <div class="vital-item">
                    <span class="vital-label">Pulse</span>
                    <span class="vital-value">${prescription.vitals.pulseRate} bpm</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.temperature ? `
                  <div class="vital-item">
                    <span class="vital-label">Temp</span>
                    <span class="vital-value">${prescription.vitals.temperature}°F</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.height ? `
                  <div class="vital-item">
                    <span class="vital-label">Height</span>
                    <span class="vital-value">${prescription.vitals.height}cm</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.sugarLevel?.preMeal ? `
                  <div class="vital-item">
                    <span class="vital-label">Pre-meal</span>
                    <span class="vital-value">${prescription.vitals.sugarLevel.preMeal} mg/dL</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.sugarLevel?.postMeal ? `
                  <div class="vital-item">
                    <span class="vital-label">Post-meal</span>
                    <span class="vital-value">${prescription.vitals.sugarLevel.postMeal} mg/dL</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.sugarLevel?.fastingGlucose ? `
                  <div class="vital-item">
                    <span class="vital-label">Fasting</span>
                    <span class="vital-value">${prescription.vitals.sugarLevel.fastingGlucose} mg/dL</span>
                  </div>
                  ` : ''}
                  ${prescription.vitals?.sugarLevel?.randomGlucose ? `
                  <div class="vital-item">
                    <span class="vital-label">Random</span>
                    <span class="vital-value">${prescription.vitals.sugarLevel.randomGlucose} mg/dL</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              ` : ''}

              <!-- Medicines Section -->
              ${prescription.medicines && prescription.medicines.length > 0 ? `
              <div class="medicines-section">
                <div class="medicines-header">💊 PRESCRIPTION (Rx) - ${prescription.medicines.length} Medicine${prescription.medicines.length > 1 ? 's' : ''} Prescribed</div>
                <div class="medicine-list">
                  ${prescription.medicines.map((medicine, index) => `
                    <div class="medicine-item">
                      <div class="medicine-number">${index + 1}</div>
                      <div class="medicine-details">
                        <div class="medicine-name">${medicine.medicineName}</div>
                        ${medicine.composition ? `
                        <div class="medicine-composition">Composition: ${medicine.composition}</div>
                        ` : ''}
                        <div class="medicine-dosage">Dosage: ${medicine.dosage}</div>
                        ${medicine.instructions ? `
                        <div class="medicine-instructions">
                          Special Instructions: ${medicine.instructions}
                        </div>
                        ` : ''}
                      </div>
                      <div class="medicine-frequency">
                        <div style="font-weight: bold; font-size: 10px; margin-bottom: 2px;">${medicine.frequency}</div>
                        <div style="font-size: 8px; color: #666;">Duration: ${medicine.duration}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
              ` : ''}

              <!-- Professional Footer -->
              <div class="prescription-footer">
                <div style="font-size: 7px; color: #7f8c8d; line-height: 1.2; max-width: 200px;">
                  <div style="font-weight: bold; margin-bottom: 3px; color: #2c3e50;">📌 Important Information:</div>
                  <div>• Complete full course as prescribed</div>
                  <div>• Store medicines properly</div>
                  <div>• Contact doctor if adverse reactions occur</div>
                  <div style="margin-top: 6px; font-size: 8px;">
                    <strong>Prescription ID:</strong> ${prescription.prescriptionId}
                  </div>
                </div>
                <div style="text-align: right; min-width: 120px;">
                  <div style="margin-bottom: 25px;"></div>
                  <div class="doctor-name">Dr. ${doctorName}</div>
                  <div style="font-size: 9px; color: #7f8c8d;">MBBS, General Practitioner</div>
                  <div style="font-size: 7px; color: #95a5a6; margin-top: 3px;">🖋️ Digital Signature</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 300);
        };
      } else {
        toast.error('Popup blocked. Please allow popups for this site.');
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast.error(`Failed to generate prescription: ${error.message}`);
    }
  };

  const refreshData = async (): Promise<void> => {
    await loadAllData();
  };

  const toggleDarkMode = (): void => {
    setDarkMode(!darkMode);
  };

  // const handleModuleClick = (module: ModuleCard): void => {
  //   if (module.action) {
  //    navigate(module.route); // ✅ navigate to the route
  //   } else {
  //     toast.info(`${module.title} - Coming Soon!`);
  //   }
  // };

  const handleModuleClick = (module: ModuleCard): void => {
    if (module.route) {
      navigate(module.route); // ✅ navigate to the route
    } else if (module.action) {
      module.action(); // run custom action (like toast)
    } else {
      toast.info(`${module.title} - Coming Soon!`);
    }
  };

  // Create prescription functions
  const addMedicineToForm = (): void => {
    setNewPrescription(prev => ({
      ...prev,
      medicines: [...prev.medicines, { medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  const removeMedicineFromForm = (index: number): void => {
    setNewPrescription(prev => ({
      ...prev,
      medicines: prev.medicines.filter((_, i) => i !== index)
    }));
  };

  const updateMedicine = (index: number, field: string, value: string): void => {
    setNewPrescription(prev => ({
      ...prev,
      medicines: prev.medicines.map((med, i) =>
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const createPrescription = async (): Promise<void> => {
    // Validation
    if (!newPrescription.patientName.trim()) {
      toast.error('Please enter patient name');
      return;
    }
    if (!newPrescription.patientAge.trim()) {
      toast.error('Please enter patient age');
      return;
    }
    if (!newPrescription.symptoms.trim()) {
      toast.error('Please enter symptoms');
      return;
    }

    const validMedicines = newPrescription.medicines.filter(med =>
      med.medicineName.trim() !== '' &&
      med.dosage.trim() !== '' &&
      med.frequency.trim() !== '' &&
      med.duration.trim() !== ''
    );

    if (validMedicines.length === 0) {
      toast.error('Please add at least one complete medicine');
      return;
    }

    try {
      // Prepare vitals data
      const vitals: any = {};

      if (newPrescription.vitals.bloodPressureSystolic && newPrescription.vitals.bloodPressureDiastolic) {
        vitals.bloodPressureSystolic = Number(newPrescription.vitals.bloodPressureSystolic);
        vitals.bloodPressureDiastolic = Number(newPrescription.vitals.bloodPressureDiastolic);
      }

      if (newPrescription.vitals.pulseRate) vitals.pulseRate = Number(newPrescription.vitals.pulseRate);
      if (newPrescription.vitals.height) vitals.height = Number(newPrescription.vitals.height);
      if (newPrescription.vitals.temperature) vitals.temperature = Number(newPrescription.vitals.temperature);

      if (newPrescription.vitals.sugarLevel.preMeal || newPrescription.vitals.sugarLevel.postMeal ||
        newPrescription.vitals.sugarLevel.fastingGlucose || newPrescription.vitals.sugarLevel.randomGlucose) {
        vitals.sugarLevel = {};
        if (newPrescription.vitals.sugarLevel.preMeal) vitals.sugarLevel.preMeal = Number(newPrescription.vitals.sugarLevel.preMeal);
        if (newPrescription.vitals.sugarLevel.postMeal) vitals.sugarLevel.postMeal = Number(newPrescription.vitals.sugarLevel.postMeal);
        if (newPrescription.vitals.sugarLevel.fastingGlucose) vitals.sugarLevel.fastingGlucose = Number(newPrescription.vitals.sugarLevel.fastingGlucose);
        if (newPrescription.vitals.sugarLevel.randomGlucose) vitals.sugarLevel.randomGlucose = Number(newPrescription.vitals.sugarLevel.randomGlucose);
      }

      const prescriptionData: any = {
        patientDetails: {
          name: newPrescription.patientName,
          age: parseInt(newPrescription.patientAge),
          bloodGroup: newPrescription.patientBloodGroup,
          weight: parseInt(newPrescription.patientWeight),
          phone: newPrescription.patientPhone,
          address: newPrescription.patientAddress,
          patientId: `P${Date.now()}`
        },
        symptoms: newPrescription.symptoms,
        diagnosis: newPrescription.diagnosis,
        chiefComplaint: newPrescription.chiefComplaint,
        presentIllnessHistory: newPrescription.presentIllnessHistory,
        physicalExamination: newPrescription.physicalExamination,
        medicines: validMedicines,
        instructions: newPrescription.instructions,
        notes: newPrescription.notes,
        followUpDate: newPrescription.followUpDate,
        priority: newPrescription.priority,
        vitals,
        doctorName: doctorName
      };

      const created = await dynamoDBService.createPrescription(prescriptionData);

      setAllPrescriptions(prev => [created, ...prev]);
      setDashboardStats(prev => ({
        ...prev,
        totalPrescriptions: prev.totalPrescriptions + 1,
        todayPrescriptions: prev.todayPrescriptions + 1,
        pendingPrescriptions: prev.pendingPrescriptions + 1
      }));

      // Reset form
      setNewPrescription({
        patientName: '',
        patientAge: '',
        patientBloodGroup: '',
        patientWeight: '',
        patientPhone: '',
        patientAddress: '',
        symptoms: '',
        diagnosis: '',
        chiefComplaint: '',
        presentIllnessHistory: '',
        physicalExamination: '',
        instructions: '',
        notes: '',
        followUpDate: '',
        priority: 'normal',
        medicines: [{ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '' }],
        vitals: {
          bloodPressureSystolic: '',
          bloodPressureDiastolic: '',
          pulseRate: '',
          temperature: '',
          height: '',
          sugarLevel: {
            preMeal: '',
            postMeal: '',
            fastingGlucose: '',
            randomGlucose: ''
          }
        }
      });

      toast.success(`Prescription ${created.prescriptionId} created successfully!`);
      setActiveSection('viewPrescriptions');

    } catch (error: any) {
      console.error('Error creating prescription:', error);
      toast.error(`Failed to create prescription: ${error.message || 'Unknown error occurred'}`);
    }
  };

  // Render functions
  const renderConnectionStatus = () => (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      background: connectionStatus === 'connected'
        ? 'linear-gradient(135deg, #10b981, #059669)'
        : connectionStatus === 'error'
          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
          : 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '30px',
      fontSize: '11px',
      fontWeight: '600',
      zIndex: 1000,
      boxShadow: '0 6px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)',
      cursor: connectionStatus === 'error' ? 'pointer' : 'default',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.3s ease'
    }}
      onClick={() => connectionStatus === 'error' && refreshData()}
      title={connectionStatus === 'error' ? `Error: ${errorMessage}. Click to retry.` : ''}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'currentColor',
          animation: connectionStatus === 'connecting' ? 'pulse 2s infinite' : 'none'
        }}></div>
        {connectionStatus === 'connected' ? 'Database Connected' :
          connectionStatus === 'error' ? 'Connection Error' :
            'Connecting...'}
      </div>
    </div>
  );

  const renderHeader = () => (
    <div style={{
      background: darkMode
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
      padding: '24px 36px',
      borderRadius: '20px',
      marginBottom: '24px',
      boxShadow: darkMode
        ? '0 20px 40px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
        : '0 20px 40px -12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.03)',
      backdropFilter: 'blur(20px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: darkMode ? 0.03 : 0.02,
        backgroundImage: `radial-gradient(circle at 25% 25%, #667eea 0%, transparent 50%), 
                         radial-gradient(circle at 75% 75%, #764ba2 0%, transparent 50%)`,
        pointerEvents: 'none'
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-1px'
          }}>
            DocMatrix
          </h1>
          <p style={{
            margin: '0',
            fontSize: '14px',
            color: darkMode ? '#94a3b8' : '#64748b',
            fontWeight: '500',
            letterSpacing: '0.3px'
          }}>
            Enterprise Medical Practice Management Suite
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={toggleDarkMode}
            style={{
              padding: '10px',
              borderRadius: '16px',
              background: darkMode
                ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
                : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              color: darkMode ? '#f9fafb' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '18px',
              boxShadow: darkMode
                ? '0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 8px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
              transform: 'translateY(0)',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
            }}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button
            onClick={refreshData}
            disabled={loading}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '16px',
              background: loading
                ? (darkMode ? '#4b5563' : '#e5e7eb')
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '13px',
              letterSpacing: '0.3px',
              boxShadow: loading ? 'none' : '0 8px 20px rgba(16, 185, 129, 0.25)',
              transform: 'translateY(0)'
            }}
          >
            {loading ? '⟳ Syncing' : '⟳ Sync Data'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderHeroSection = () => (
    <div style={{
      background: darkMode
        ? 'linear-gradient(135deg, #875A7B 0%, #A569BD 100%)'
        : 'linear-gradient(135deg, #875A7B 0%, #A569BD 100%)',
      color: 'white',
      padding: '60px 40px',
      textAlign: 'center',
      margin: '20px',
      borderRadius: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: `radial-gradient(circle at 25% 25%, #ffffff 0%, transparent 50%), 
                         radial-gradient(circle at 75% 75%, #ffffff 0%, transparent 50%)`,
        pointerEvents: 'none'
      }}></div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '300',
          margin: '0 0 16px 0',
          lineHeight: '1.2'
        }}>
          All your medical practice on{' '}
          <span style={{
            background: 'linear-gradient(45deg, #FFD700, #FFA500)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '600'
          }}>
            one platform.
          </span>
        </h1>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '400',
          margin: '0 0 40px 0',
          opacity: 0.9
        }}>
          For Doctors Who Care. For Patients Who Heal.
        </h2>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate("/prescription/create")}
            style={{
              background: '#00b894',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 20px rgba(0, 184, 148, 0.3)'
            }}
          >
            Create Prescription
          </button>
          <button
            onClick={() => setActiveSection('prescriptionSearch')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            Search Prescriptions
          </button>
        </div>
      </div>
    </div>
  );

  const renderStatsSection = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '20px',
      margin: '20px',
      marginTop: '-30px'
    }}>
      {[
        {
          title: 'Total Prescriptions',
          value: dashboardStats.totalPrescriptions,
          subtitle: `${dashboardStats.todayPrescriptions} today`,
          color: '#875A7B',
          icon: '📋'
        },
        {
          title: 'Active Prescriptions',
          value: dashboardStats.pendingPrescriptions,
          subtitle: 'Pending fulfillment',
          color: '#00A09D',
          icon: '⚡'
        },
        {
          title: 'Total Patients',
          value: dashboardStats.totalPatients,
          subtitle: 'Registered records',
          color: '#017E84',
          icon: '👥'
        },
        {
          title: 'Medicines Available',
          value: dashboardStats.totalMedicines,
          subtitle: `${dashboardStats.lowStockMedicines} low stock`,
          color: '#6C5CE7',
          icon: '💊'
        }
      ].map((stat, index) => (
        <div key={index} style={{
          background: darkMode
            ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E8E8E8',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: darkMode
            ? '0 8px 25px rgba(0,0,0,0.3)'
            : '0 8px 25px rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            fontSize: '24px',
            opacity: 0.3
          }}>
            {stat.icon}
          </div>
          <div style={{
            fontSize: '36px',
            fontWeight: '700',
            color: stat.color,
            marginBottom: '8px'
          }}>
            {stat.value}
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: darkMode ? '#f9fafb' : '#2C3E50',
            marginBottom: '4px'
          }}>
            {stat.title}
          </div>
          <div style={{
            fontSize: '14px',
            color: darkMode ? '#9ca3af' : '#7F8C8D'
          }}>
            {stat.subtitle}
          </div>
        </div>
      ))}
    </div>
  );

  const renderModulesSection = () => (
    <div style={{ margin: '40px 20px' }}>
      <h2 style={{
        fontSize: '32px',
        fontWeight: '300',
        color: darkMode ? '#f9fafb' : '#2C3E50',
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        Enhanced Practice Management Modules
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {modules.map((module) => (
          <div
            key={module.id}
            onClick={() => {
              if (module.id === "search") {
                setActiveSection("prescriptionSearch"); // ✅ Only for Search
              } else {
                handleModuleClick(module); // ✅ Others unchanged
              }
            }}
            style={{
              background: darkMode
                ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
                : 'white',
              border: darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid #E8E8E8',
              borderRadius: '16px',
              padding: '30px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.4s ease',
              position: 'relative',
              overflow: 'hidden',
              transform: 'translateY(0)',
              boxShadow: darkMode
                ? '0 8px 25px rgba(0,0,0,0.3)'
                : '0 8px 25px rgba(0,0,0,0.08)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = darkMode
                ? '0 20px 40px rgba(0,0,0,0.4)'
                : '0 20px 40px rgba(0,0,0,0.15)';
              e.currentTarget.style.borderColor = module.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = darkMode
                ? '0 8px 25px rgba(0,0,0,0.3)'
                : '0 8px 25px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = darkMode ? 'rgba(255,255,255,0.1)' : '#E8E8E8';
            }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              background: module.bgColor,
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: `0 8px 20px ${module.color}20`
            }}>
              {module.icon}
            </div>

            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: darkMode ? '#f9fafb' : '#2C3E50',
              marginBottom: '12px'
            }}>
              {module.title}
            </h3>

            <p style={{
              fontSize: '14px',
              color: darkMode ? '#9ca3af' : '#7F8C8D',
              lineHeight: '1.5',
              margin: 0
            }}>
              {module.description}
            </p>

            {/* Module-specific badges */}
            {module.id === 'prescriptions' && dashboardStats.todayPrescriptions > 0 && (
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#E74C3C',
                color: 'white',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {dashboardStats.todayPrescriptions} today
              </div>
            )}

            {module.id === 'medicines' && dashboardStats.lowStockMedicines > 0 && (
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: '#F39C12',
                color: 'white',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {dashboardStats.lowStockMedicines} low stock
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );


  // Enhanced prescription search render
  const renderPrescriptionSearch = () => (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{
        background: darkMode
          ? 'linear-gradient(135deg, #1f2937 0%, #374151 100%)'
          : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        padding: '48px',
        borderRadius: '28px',
        boxShadow: darkMode
          ? '0 25px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 25px 60px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        color: darkMode ? '#f9fafb' : '#1f2937',
        border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h3 style={{
            color: darkMode ? '#f9fafb' : '#1f2937',
            margin: 0,
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.5px'
          }}>
            🔍 Enhanced Prescription Search Engine
          </h3>
          <button
            onClick={() => setActiveSection('overview')}
            style={{
              background: darkMode ? '#4b5563' : '#6b7280',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '32px',
          padding: '24px',
          background: darkMode
            ? 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'
            : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderRadius: '20px',
          border: darkMode ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.03)'
        }}>
          <input
            type="text"
            placeholder="Enter Prescription ID (e.g., RX-1234567890)"
            value={prescriptionId}
            onChange={(e) => setPrescriptionId(e.target.value)}
            style={{
              flex: 1,
              padding: '18px 24px',
              border: `2px solid ${darkMode ? '#4b5563' : '#d1d5db'}`,
              borderRadius: '16px',
              fontSize: '17px',
              background: darkMode ? '#4b5563' : 'white',
              color: darkMode ? '#f9fafb' : '#1f2937',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              outline: 'none'
            }}
            onKeyPress={(e) => e.key === 'Enter' && searchPrescriptionById()}
          />
          <button
            onClick={searchPrescriptionById}
            disabled={prescriptionLoading}
            style={{
              padding: '18px 36px',
              background: prescriptionLoading
                ? '#6b7280'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: prescriptionLoading ? 'not-allowed' : 'pointer',
              fontSize: '17px',
              fontWeight: '800',
              letterSpacing: '0.3px',
              boxShadow: prescriptionLoading ? 'none' : '0 10px 25px rgba(102, 126, 234, 0.25)',
              transition: 'all 0.3s ease'
            }}
          >
            {prescriptionLoading ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>

        {foundPrescription && (
          <div style={{
            border: '3px solid #10b981',
            borderRadius: '20px',
            padding: '32px',
            backgroundColor: darkMode ? 'rgba(6, 95, 70, 0.15)' : '#f0fdf4',
            marginBottom: '32px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.15)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h4 style={{ color: '#10b981', margin: 0, fontSize: '22px', fontWeight: '800' }}>
                ✅ Prescription Found Successfully
              </h4>
              <button
                onClick={() => printPrescription(foundPrescription)}
                style={{
                  padding: '14px 28px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '15px',
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.25)',
                  transition: 'all 0.3s ease'
                }}
              >
                🖨️ Print Professional Format
              </button>
            </div>

            {/* Enhanced prescription details display */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', marginBottom: '28px' }}>
              <div style={{
                background: darkMode ? '#374151' : 'white',
                padding: '24px',
                borderRadius: '16px',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb'
              }}>
                <h5 style={{
                  color: darkMode ? '#f9fafb' : '#1f2937',
                  marginBottom: '18px',
                  fontSize: '18px',
                  fontWeight: '800'
                }}>
                  👤 Patient Information
                </h5>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div><strong>Name:</strong> {foundPrescription.patientDetails?.name || 'N/A'}</div>
                  <div><strong>Age:</strong> {foundPrescription.patientDetails?.age || 'N/A'} years</div>
                  <div><strong>Blood Group:</strong> {foundPrescription.patientDetails?.bloodGroup || 'N/A'}</div>
                  <div><strong>Weight:</strong> {foundPrescription.patientDetails?.weight || 'N/A'} kg</div>
                </div>
              </div>
              <div style={{
                background: darkMode ? '#374151' : 'white',
                padding: '24px',
                borderRadius: '16px',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb'
              }}>
                <h5 style={{
                  color: darkMode ? '#f9fafb' : '#1f2937',
                  marginBottom: '18px',
                  fontSize: '18px',
                  fontWeight: '800'
                }}>
                  📋 Prescription Details
                </h5>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div><strong>ID:</strong> {foundPrescription.prescriptionId}</div>
                  <div><strong>Doctor:</strong> {foundPrescription.doctorId}</div>
                  <div><strong>Date:</strong> {new Date(foundPrescription.createdAt).toLocaleDateString()}</div>
                  <div><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{foundPrescription.status}</span></div>
                </div>
              </div>
            </div>

            {/* Enhanced vitals display */}
            {foundPrescription.vitals && (
              <div style={{
                marginBottom: '28px',
                background: darkMode ? '#374151' : 'white',
                padding: '24px',
                borderRadius: '16px',
                border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb'
              }}>
                <h5 style={{
                  color: darkMode ? '#f9fafb' : '#1f2937',
                  marginBottom: '18px',
                  fontSize: '18px',
                  fontWeight: '800'
                }}>
                  🩺 Vital Signs
                </h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {foundPrescription.vitals.bloodPressureSystolic && foundPrescription.vitals.bloodPressureDiastolic && (
                    <div><strong>Blood Pressure:</strong> {foundPrescription.vitals.bloodPressureSystolic}/{foundPrescription.vitals.bloodPressureDiastolic} mmHg</div>
                  )}
                  {foundPrescription.vitals.pulseRate && (
                    <div><strong>Pulse Rate:</strong> {foundPrescription.vitals.pulseRate} bpm</div>
                  )}
                  {foundPrescription.vitals.temperature && (
                    <div><strong>Temperature:</strong> {foundPrescription.vitals.temperature}°F</div>
                  )}
                  {foundPrescription.vitals.height && (
                    <div><strong>Height:</strong> {foundPrescription.vitals.height} cm</div>
                  )}
                  {foundPrescription.vitals.sugarLevel && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong>Sugar Levels:</strong> {formatSugarLevelObject(foundPrescription.vitals.sugarLevel)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Clinical information */}
            <div style={{
              marginBottom: '28px',
              background: darkMode ? '#374151' : 'white',
              padding: '24px',
              borderRadius: '16px',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb'
            }}>
              <h5 style={{
                color: darkMode ? '#f9fafb' : '#1f2937',
                marginBottom: '18px',
                fontSize: '18px',
                fontWeight: '800'
              }}>
                🩺 Clinical Information
              </h5>
              <div style={{ display: 'grid', gap: '12px' }}>
                {foundPrescription.chiefComplaint && (
                  <div><strong>Chief Complaint:</strong> {foundPrescription.chiefComplaint}</div>
                )}
                <div><strong>Symptoms:</strong> {foundPrescription.symptoms}</div>
                {foundPrescription.diagnosis && (
                  <div><strong>Diagnosis:</strong> {foundPrescription.diagnosis}</div>
                )}
                {foundPrescription.physicalExamination && (
                  <div><strong>Physical Examination:</strong> {foundPrescription.physicalExamination}</div>
                )}
              </div>
            </div>

            {/* Enhanced medicines display */}
            <div>
              <h5 style={{
                color: darkMode ? '#f9fafb' : '#1f2937',
                marginBottom: '24px',
                fontSize: '18px',
                fontWeight: '800'
              }}>
                💊 Prescribed Medications ({foundPrescription.medicines.length})
              </h5>
              {foundPrescription.medicines.map((medicine, index) => (
                <div key={index} style={{
                  background: darkMode ? '#4b5563' : 'white',
                  border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '20px'
                }}>
                  <h6 style={{
                    color: darkMode ? '#f9fafb' : '#1f2937',
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    fontWeight: '800'
                  }}>
                    {index + 1}. {medicine.medicineName}
                  </h6>
                  {medicine.composition && (
                    <p style={{
                      margin: '0 0 16px 0',
                      fontSize: '15px',
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      <strong>Composition:</strong> {medicine.composition}
                    </p>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '20px',
                    fontSize: '15px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      background: darkMode ? '#374151' : '#f8fafc',
                      padding: '12px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ fontWeight: '700', color: '#6b7280', fontSize: '13px' }}>DOSAGE</div>
                      <div style={{ fontWeight: '600', marginTop: '4px' }}>{medicine.dosage}</div>
                    </div>
                    <div style={{
                      background: darkMode ? '#374151' : '#f8fafc',
                      padding: '12px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ fontWeight: '700', color: '#6b7280', fontSize: '13px' }}>FREQUENCY</div>
                      <div style={{ fontWeight: '600', marginTop: '4px' }}>{medicine.frequency}</div>
                    </div>
                    <div style={{
                      background: darkMode ? '#374151' : '#f8fafc',
                      padding: '12px',
                      borderRadius: '12px'
                    }}>
                      <div style={{ fontWeight: '700', color: '#6b7280', fontSize: '13px' }}>DURATION</div>
                      <div style={{ fontWeight: '600', marginTop: '4px' }}>{medicine.duration}</div>
                    </div>
                  </div>
                  {medicine.instructions && (
                    <div style={{
                      background: '#fef3c7',
                      border: '1px solid #fde68a',
                      borderRadius: '12px',
                      padding: '16px'
                    }}>
                      <div style={{ fontWeight: '800', color: '#92400e', marginBottom: '8px' }}>
                        ⚠️ Special Instructions:
                      </div>
                      <div style={{ color: '#92400e', lineHeight: '1.5' }}>
                        {medicine.instructions}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent prescriptions list */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{
            color: darkMode ? '#f9fafb' : '#1f2937',
            marginBottom: '24px',
            fontSize: '22px',
            fontWeight: '800'
          }}>
            📋 Recent Prescriptions Database ({allPrescriptions.length})
          </h3>
          {allPrescriptions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#6b7280',
              background: darkMode ? '#374151' : '#f8fafc',
              borderRadius: '20px',
              border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>📋</div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '700' }}>
                No prescriptions found in database
              </h4>
              <p style={{ margin: '0 0 24px 0', fontSize: '16px' }}>
                Connection Status: {connectionStatus}
              </p>
              <button
                onClick={() => setActiveSection('createPrescription')}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '16px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.25)'
                }}
              >
                Create First Prescription
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
              {allPrescriptions.slice(0, 10).map((prescription) => (
                <div key={prescription.prescriptionId} style={{
                  border: darkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '24px',
                  background: darkMode ? '#374151' : '#f8fafc',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        color: darkMode ? '#f9fafb' : '#1f2937',
                        margin: '0 0 12px 0',
                        fontWeight: '800',
                        fontSize: '18px'
                      }}>
                        {prescription.prescriptionId}
                      </h4>
                      <p style={{ margin: '6px 0', fontSize: '15px', color: '#6b7280' }}>
                        <strong>Patient:</strong> {prescription.patientDetails?.name || 'Unknown'} |
                        <strong> Doctor:</strong> {prescription.doctorId}
                      </p>
                      <p style={{ margin: '6px 0', fontSize: '13px', color: '#9ca3af' }}>
                        Created: {new Date(prescription.createdAt).toLocaleDateString()} |
                        Medicines: {prescription.medicines.length}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => {
                          setPrescriptionId(prescription.prescriptionId);
                          setFoundPrescription(prescription);
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => printPrescription(prescription)}
                        style={{
                          padding: '8px 16px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '12px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        Print
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        background: darkMode
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
          : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
        color: darkMode ? '#f9fafb' : '#1f2937'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px',
          animation: 'pulse 2s ease-in-out infinite alternate'
        }}>🏥</div>
        <div style={{
          fontSize: '22px',
          fontWeight: '800',
          marginBottom: '8px',
          letterSpacing: '-0.5px'
        }}>
          Loading DocNest...
        </div>
        <div style={{
          fontSize: '14px',
          color: darkMode ? '#94a3b8' : '#64748b',
          textAlign: 'center',
          maxWidth: '350px',
          lineHeight: '1.5'
        }}>
          {connectionStatus === 'connecting' ? 'Establishing secure database connection...' :
            connectionStatus === 'error' ? `Connection failed: ${errorMessage}` :
              'Synchronizing medical data...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '16px',
      background: darkMode
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      minHeight: '100vh',
      color: darkMode ? '#f9fafb' : '#1f2937',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      {/* Show error message if connection failed */}
      {connectionStatus === 'error' && (
        <div style={{
          background: darkMode
            ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: `2px solid ${darkMode ? '#dc2626' : '#f87171'}`,
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '20px',
          color: darkMode ? '#fecaca' : '#dc2626',
          boxShadow: '0 10px 30px rgba(220, 38, 38, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ fontSize: '14px' }}>⚠️ Database Connection Error</strong>
              <div style={{ marginTop: '6px', fontSize: '12px' }}>{errorMessage}</div>
            </div>
            <button
              onClick={refreshData}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '13px'
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      {renderHeader()}

      {/* Main Content */}
      {activeSection === 'overview' && (
        <>
          {renderHeroSection()}
          {renderStatsSection()}
          {renderModulesSection()}
        </>
      )}
      {activeSection === 'prescriptionSearch' && renderPrescriptionSearch()}

      {/* Connection Status Indicator */}
      {renderConnectionStatus()}

      {/* CSS animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default Dashboard;