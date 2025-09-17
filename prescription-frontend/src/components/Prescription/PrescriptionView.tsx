// src/components/Prescription/PrescriptionView.tsx - PROFESSIONAL FORMAT WITH TEST BANNER
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface PrescriptionMedicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PatientDetails {
  name: string;
  age: number;
  bloodGroup: string;
  weight: number;
  phone?: string;
  address?: string;
  gender?: string;
}

interface PatientVitals {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;
  height?: number;
  temperature?: number;
  sugarLevel?: {
    preMeal?: number;
    postMeal?: number;
    fastingGlucose?: number;
    randomGlucose?: number;
  };
}

interface Prescription {
  prescriptionId: string;
  doctorId: string;
  doctorName?: string;
  patientDetails: PatientDetails;
  symptoms: string;
  diagnosis?: string;
  medicines: PrescriptionMedicine[];
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
  priority?: 'normal' | 'urgent' | 'emergency';
  followUpDate?: string;
  notes?: string;
  vitals?: PatientVitals;
  chiefComplaint?: string;
  presentIllnessHistory?: string;
  physicalExamination?: string;
  instructions?: string;
  prescriptionDate?: string;
}

const PrescriptionView: React.FC = () => {
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Get authentication token
  const getAuthToken = () => {
    const idTokenKey = 'CognitoIdentityServiceProvider.5sjuf1atk9mi8ufregrsgskkdu.parool.10bng_1753447053426.idToken';
    return localStorage.getItem(idTokenKey);
  };

  const formatDate = (date?: string) => {
    if (!date) return new Date().toLocaleDateString('en-GB');
    return new Date(date).toLocaleDateString('en-GB');
  };

  const formatBloodPressure = (systolic?: number | string, diastolic?: number | string) => {
    if (!systolic || !diastolic) return null;
    return `${systolic}/${diastolic}`;
  };

  const doctorName = prescription?.doctorName || prescription?.doctorId || 'Doctor';

  const handlePrint = () => {
    const printContent = previewRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Professional Prescription - ${prescription?.prescriptionId}</title>
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
            .complaints-section { 
              margin-bottom: 12px; 
              background: #fafafa;
              padding: 10px;
              border-radius: 4px;
              border-left: 3px solid #27ae60;
            }
            .section-title { 
              font-weight: bold; 
              color: #2c3e50; 
              border-bottom: 1px solid #bdc3c7; 
              padding-bottom: 3px; 
              margin-bottom: 8px;
              font-size: 11px;
              text-transform: uppercase;
            }
            .complaint-text { 
              color: #333; 
              line-height: 1.3; 
              margin-bottom: 5px;
              font-size: 9px;
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
              display: 'flex'; 
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
            .instructions-section { 
              background: #fffbf0; 
              border: 1px solid #f39c12; 
              border-radius: 4px; 
              margin: 10px 0; 
              border-left: 3px solid #f39c12;
            }
            .instructions-header { 
              font-size: 10px; 
              font-weight: bold; 
              padding: 6px 10px; 
              background: #f39c12; 
              color: white;
            }
            .instructions-content { 
              padding: 8px; 
              font-size: 9px; 
              line-height: 1.3; 
              color: #333;
            }
            .prescription-footer { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-end; 
              margin-top: 15px; 
              padding-top: 8px; 
              border-top: 2px solid #2c3e50; 
            }
            .footer-left { 
              font-size: 7px; 
              color: #7f8c8d; 
              line-height: 1.2;
              max-width: 200px;
            }
            .doctor-signature { 
              text-align: right; 
              min-width: 120px;
            }
            .doctor-name { 
              font-size: 12px; 
              font-weight: bold; 
              color: #2c3e50; 
              margin-bottom: 3px;
              border-bottom: 1px solid #2c3e50;
              padding-bottom: 2px;
            }
            .doctor-title { 
              font-size: 9px; 
              color: #7f8c8d; 
              margin-bottom: 2px;
            }
            .registration-number {
              font-size: 8px;
              color: #95a5a6;
              font-style: italic;
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
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  useEffect(() => {
    const fetchPrescription = async () => {
      if (!prescriptionId) {
        setError('Prescription ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const token = getAuthToken();
        let foundPrescription: Prescription | null = null;

        if (token) {
          try {
            const response = await fetch(`https://ich7ycwdq2.execute-api.ap-south-1.amazonaws.com/prod/prescriptions/${prescriptionId}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              foundPrescription = data.prescription || data;
            }
          } catch (apiError) {
            console.warn('API fetch failed, trying localStorage');
          }
        }

        if (!foundPrescription) {
          const savedPrescriptions = JSON.parse(localStorage.getItem('prescriptions') || '[]');
          foundPrescription = savedPrescriptions.find((p: Prescription) => p.prescriptionId === prescriptionId);
        }

        if (foundPrescription) {
          setPrescription(foundPrescription);
        } else {
          setError('Prescription not found');
        }
      } catch (err) {
        console.error('Failed to fetch prescription:', err);
        setError('Failed to fetch prescription details');
        toast.error('Failed to fetch prescription');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescription();
  }, [prescriptionId]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        flexDirection: 'column',
        color: '#666'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
        <h3>Loading prescription...</h3>
        <p>Please wait while we fetch the prescription details.</p>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        flexDirection: 'column',
        color: '#666'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
        <h3>Prescription not found</h3>
        <p>The requested prescription could not be loaded.</p>
        <button
          onClick={() => navigate('/prescription/list')}
          style={{
            padding: '12px 24px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          ← Back to Prescriptions
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      {/* 🚨 TEST BANNER - If you see this, the file is updating! 🚨 */}
      <div className="no-print" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'red',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        zIndex: 9999,
        border: '5px solid yellow'
      }}>
        🚨 FILE UPDATED SUCCESSFULLY - PROFESSIONAL FORMAT LOADED! 🚨
      </div>

      {/* Navigation Header */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginTop: '80px' // Account for test banner
      }}>
        <div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#2c3e50',
            margin: '0 0 5px 0'
          }}>
            🥼 Professional Medical Prescription (NEW FORMAT)
          </h1>
          <p style={{ 
            color: '#7f8c8d', 
            margin: 0,
            fontSize: '14px'
          }}>
            Prescription ID: {prescriptionId}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => navigate('/prescription/list')}
            style={{
              padding: '12px 20px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ← Back to List
          </button>
          <button
            onClick={() => navigate(`/prescription/edit/${prescriptionId}`)}
            style={{
              padding: '12px 20px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={handlePrint}
            style={{
              padding: '12px 20px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🖨️ Print Professional Format
          </button>
        </div>
      </div>

      {/* Professional Prescription Content */}
      <div style={{ 
        background: 'white', 
        borderRadius: '15px', 
        padding: '25px', 
        boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '25px',
          borderBottom: '3px solid #3498db',
          paddingBottom: '20px'
        }}>
          <h2 style={{ color: '#2c3e50', fontSize: '2em', margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🥼 DOCNEST MEDICAL CENTER - Professional Prescription
          </h2>
          <button
            onClick={handlePrint}
            className="no-print"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #3498db, #2980b9)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 6px 15px rgba(52, 152, 219, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🖨️ Print Professional Format
          </button>
        </div>

        {/* THE PROFESSIONAL PRESCRIPTION CONTENT */}
        <div ref={previewRef} style={{ 
          border: '2px solid #2c3e50', 
          borderRadius: '8px', 
          padding: '20px', 
          background: 'white',
          fontFamily: 'Times New Roman, serif',
          fontSize: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div className="prescription-container">
            {/* Professional Clinic Header */}
            <div className="clinic-header">
              <div className="clinic-name">DOCNEST MEDICAL CENTER</div>
              <div className="clinic-address">Building No. 15, 2nd Floor, Tech Park Plaza</div>
              <div className="clinic-address">Whitefield Main Road, EPIP Zone</div>
              <div className="clinic-address">Bangalore - 560066, Karnataka</div>
              <div className="clinic-contact">
                📞 +91-9876543210 | 📧 care@docnest.com | 🌐 www.docnest.com
              </div>
            </div>

            {/* Prescription Date */}
            <div className="prescription-date">
              📅 Date: {formatDate(prescription.prescriptionDate || prescription.createdAt)}
            </div>

            {/* RX Symbol and Patient Info */}
            <div style={{ position: 'relative', marginBottom: '15px' }}>
              <div className="rx-symbol">℞</div>
              <div className="patient-info">
                <div className="patient-row">
                  <div>
                    <span className="patient-label">Patient:</span>
                    <span className="patient-value">{prescription.patientDetails?.name || 'Patient Name'}</span>
                  </div>
                  <div>
                    <span className="patient-label">Age/Gender:</span>
                    <span className="patient-value">{prescription.patientDetails?.age || 0}Y / {prescription.patientDetails?.gender || 'F'}</span>
                  </div>
                </div>
                <div className="patient-row">
                  <div>
                    <span className="patient-label">Address:</span>
                    <span className="patient-value">{prescription.patientDetails?.address || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="patient-label">Phone:</span>
                    <span className="patient-value">{prescription.patientDetails?.phone || 'Not provided'}</span>
                  </div>
                </div>
                <div className="patient-row">
                  <div>
                    <span className="patient-label">Weight:</span>
                    <span className="patient-value">{prescription.patientDetails?.weight || 0} kg</span>
                  </div>
                  {prescription.patientDetails?.bloodGroup && (
                    <div>
                      <span className="patient-label">Blood Group:</span>
                      <span className="patient-value">{prescription.patientDetails.bloodGroup}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Comprehensive Vitals Section - Show ALL entered vitals */}
            {(prescription.vitals?.bloodPressureSystolic || prescription.vitals?.pulseRate || prescription.vitals?.temperature || 
              prescription.vitals?.height || prescription.vitals?.sugarLevel?.preMeal || prescription.vitals?.sugarLevel?.postMeal ||
              prescription.vitals?.sugarLevel?.fastingGlucose || prescription.vitals?.sugarLevel?.randomGlucose) && (
              <div className="vitals-section">
                <div className="vitals-title">🩺 VITAL SIGNS & MEASUREMENTS</div>
                <div className="vitals-grid">
                  {prescription.vitals?.bloodPressureSystolic && prescription.vitals?.bloodPressureDiastolic && (
                    <div className="vital-item">
                      <span className="vital-label">BP</span>
                      <span className="vital-value">{formatBloodPressure(prescription.vitals.bloodPressureSystolic, prescription.vitals.bloodPressureDiastolic)} mmHg</span>
                    </div>
                  )}
                  {prescription.vitals?.pulseRate && (
                    <div className="vital-item">
                      <span className="vital-label">Pulse</span>
                      <span className="vital-value">{prescription.vitals.pulseRate} bpm</span>
                    </div>
                  )}
                  {prescription.vitals?.temperature && (
                    <div className="vital-item">
                      <span className="vital-label">Temp</span>
                      <span className="vital-value">{prescription.vitals.temperature}°F</span>
                    </div>
                  )}
                  {prescription.vitals?.height && (
                    <div className="vital-item">
                      <span className="vital-label">Height</span>
                      <span className="vital-value">{prescription.vitals.height}cm</span>
                    </div>
                  )}
                  {prescription.vitals?.sugarLevel?.preMeal && (
                    <div className="vital-item">
                      <span className="vital-label">Pre-meal</span>
                      <span className="vital-value">{prescription.vitals.sugarLevel.preMeal} mg/dL</span>
                    </div>
                  )}
                  {prescription.vitals?.sugarLevel?.postMeal && (
                    <div className="vital-item">
                      <span className="vital-label">Post-meal</span>
                      <span className="vital-value">{prescription.vitals.sugarLevel.postMeal} mg/dL</span>
                    </div>
                  )}
                  {prescription.vitals?.sugarLevel?.fastingGlucose && (
                    <div className="vital-item">
                      <span className="vital-label">Fasting</span>
                      <span className="vital-value">{prescription.vitals.sugarLevel.fastingGlucose} mg/dL</span>
                    </div>
                  )}
                  {prescription.vitals?.sugarLevel?.randomGlucose && (
                    <div className="vital-item">
                      <span className="vital-label">Random</span>
                      <span className="vital-value">{prescription.vitals.sugarLevel.randomGlucose} mg/dL</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comprehensive Clinical Assessment - Show ALL entered details */}
            <div className="complaints-section">
              <div className="section-title">📋 CLINICAL ASSESSMENT & FINDINGS</div>
              {prescription.chiefComplaint && (
                <div className="complaint-text">
                  <strong>Chief Complaint:</strong> {prescription.chiefComplaint}
                </div>
              )}
              {prescription.symptoms && (
                <div className="complaint-text">
                  <strong>Presenting Symptoms:</strong> {prescription.symptoms}
                </div>
              )}
              {prescription.presentIllnessHistory && (
                <div className="complaint-text">
                  <strong>History of Present Illness:</strong> {prescription.presentIllnessHistory}
                </div>
              )}
              {prescription.physicalExamination && (
                <div className="complaint-text">
                  <strong>Physical Examination Findings:</strong> {prescription.physicalExamination}
                </div>
              )}
              {prescription.diagnosis && (
                <div className="complaint-text">
                  <strong>Clinical Diagnosis:</strong> {prescription.diagnosis}
                </div>
              )}
              {prescription.priority && prescription.priority !== 'normal' && (
                <div className="complaint-text">
                  <strong>Priority Level:</strong> <span style={{ color: prescription.priority === 'emergency' ? '#e74c3c' : '#f39c12', fontWeight: 'bold', textTransform: 'uppercase' }}>{prescription.priority}</span>
                </div>
              )}
            </div>

            {/* Comprehensive Medicines Section - Show ALL medicine details */}
            {prescription.medicines && prescription.medicines.length > 0 && (
              <div className="medicines-section">
                <div className="medicines-header">💊 PRESCRIPTION (Rx) - {prescription.medicines.length} Medicine{prescription.medicines.length > 1 ? 's' : ''} Prescribed</div>
                <div className="medicine-list">
                  {prescription.medicines.map((medicine: any, index: number) => (
                    <div key={index} className="medicine-item">
                      <div className="medicine-number">{index + 1}</div>
                      <div className="medicine-details">
                        <div className="medicine-name">{medicine.medicineName}</div>
                        {medicine.composition && (
                          <div className="medicine-composition">Composition: {medicine.composition}</div>
                        )}
                        <div className="medicine-dosage">Dosage: {medicine.dosage}</div>
                        {medicine.instructions && (
                          <div className="medicine-instructions">
                            Special Instructions: {medicine.instructions}
                          </div>
                        )}
                      </div>
                      <div className="medicine-frequency">
                        <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>{medicine.frequency}</div>
                        <div style={{ fontSize: '8px', color: '#666' }}>Duration: {medicine.duration}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comprehensive Instructions - Show ALL entered instructions */}
            {(prescription.instructions || prescription.notes || prescription.followUpDate) && (
              <div className="instructions-section">
                <div className="instructions-header">📝 CLINICAL INSTRUCTIONS & MEDICAL ADVICE</div>
                <div className="instructions-content">
                  {prescription.instructions && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>General Instructions:</strong><br />
                      {prescription.instructions}
                    </div>
                  )}
                  {prescription.notes && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Additional Clinical Notes:</strong><br />
                      {prescription.notes}
                    </div>
                  )}
                  {prescription.followUpDate && (
                    <div style={{ marginBottom: '8px' }}>
                      <strong>📅 Follow-up Appointment:</strong> {formatDate(prescription.followUpDate)}
                    </div>
                  )}
                  <div style={{ marginTop: '10px', fontSize: '8px', color: '#e67e22', fontWeight: 'bold', background: '#fff3cd', padding: '4px', borderRadius: '3px' }}>
                    ⚠️ IMPORTANT: Complete the full course of medication as prescribed. Contact doctor immediately if any adverse reactions occur.
                  </div>
                </div>
              </div>
            )}

            {/* Comprehensive Professional Footer */}
            <div className="prescription-footer">
              <div className="footer-left">
                <div style={{ fontWeight: 'bold', marginBottom: '3px', color: '#2c3e50' }}>📌 Important Medical Information:</div>
                <div>• Prescription valid for 30 days from issue date</div>
                <div>• Store medicines in cool, dry place away from children</div>
                <div>• Do not share prescribed medicines with others</div>
                <div>• For medical emergencies, visit nearest hospital immediately</div>
                <div>• Complete full course even if symptoms improve</div>
                {prescription.prescriptionId && (
                  <div style={{ marginTop: '6px', fontSize: '8px', color: '#666' }}>
                    <strong>Prescription ID:</strong> {prescription.prescriptionId}
                  </div>
                )}
                {prescription.createdAt && (
                  <div style={{ fontSize: '8px', color: '#666' }}>
                    <strong>Created:</strong> {new Date(prescription.createdAt).toLocaleString()}
                  </div>
                )}
                <div style={{ marginTop: '6px', fontSize: '7px', fontStyle: 'italic', color: '#95a5a6' }}>
                  * This digital prescription is not valid for medicolegal purposes
                </div>
              </div>
              <div className="doctor-signature">
                <div style={{ marginBottom: '25px' }}></div>
                <div className="doctor-name">Dr. {doctorName}</div>
                <div className="doctor-title">MBBS, General Practitioner</div>
                <div className="registration-number">Reg: KMC-{new Date().getFullYear()}-{Math.floor(Math.random() * 10000)}</div>
                <div style={{ fontSize: '7px', color: '#95a5a6', marginTop: '3px' }}>
                  🖋️ Digital Signature
                </div>
                <div style={{ fontSize: '7px', color: '#999', marginTop: '2px' }}>
                  DocNest Medical Center
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
          }
        `}
      </style>
    </div>
  );
};

export default PrescriptionView;