// src/components/Patient/PatientForm.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface EmergencyContact {
  name: string;
  phone: string;
}

interface PatientDetails {
  name: string;
  age: number;
  bloodGroup: string;
  weight: number;
  height?: number;
  phone: string;
  address: string;
  allergies?: string[];
  emergencyContact: EmergencyContact;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMMON_ALLERGIES = [
  'Penicillin',
  'Aspirin',
  'Ibuprofen',
  'Peanuts',
  'Shellfish',
  'Latex',
  'Dust',
  'Pollen',
];

const PatientForm: React.FC = () => {
  const navigate = useNavigate();

  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PatientDetails>({
    defaultValues: {
      name: '',
      age: undefined,
      bloodGroup: '',
      weight: undefined,
      height: undefined,
      phone: '',
      address: '',
      allergies: [],
      emergencyContact: { name: '', phone: '' },
    },
  });

  const handleAllergyToggle = (allergy: string) => {
    setSelectedAllergies((a) =>
      a.includes(allergy) ? a.filter((x) => x !== allergy) : [...a, allergy]
    );
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergy.trim();
    if (trimmed && !selectedAllergies.includes(trimmed)) {
      setSelectedAllergies([...selectedAllergies, trimmed]);
      setCustomAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    setSelectedAllergies((a) => a.filter((x) => x !== allergy));
  };

  const getAuthToken = () => {
    const idTokenKey = Object.keys(localStorage).find((k) => k.endsWith('.idToken'));
    if (!idTokenKey) return null;
    return localStorage.getItem(idTokenKey);
  };

  const onSubmit = async (data: PatientDetails) => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Session expired. Please login again.');
        navigate('/login');
        return;
      }

      const patientData = {
        ...data,
        allergies: selectedAllergies,
        patientId: `PAT_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
      };

      const response = await fetch(
        'https://ich7ycwdq2.execute-api.ap-south-1.amazonaws.com/prod/patients',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patientData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save patient (${response.status})`);
      }

      toast.success('Patient created successfully!');
      reset();
      setSelectedAllergies([]);
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Error creating patient.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '900px',
        margin: '2rem auto',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 18px rgb(0 0 0 / 0.1)',
        padding: '2rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <h1 style={{ fontSize: '2rem', color: '#334155' }}>👤 Add New Patient</h1>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#fceded',
            borderRadius: '8px',
            border: '1px solid #e74c3c',
            color: '#e74c3c',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          ← Back to Dashboard
        </button>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr' }}
      >
        {/* Basic Info Card */}
        <section
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '1.5rem',
            borderRadius: '12px',
            color: 'white',
            boxShadow: '0 10px 30px rgb(102 126 234 / 0.3)',
          }}
        >
          <h2 style={{ fontWeight: '700', marginBottom: '1rem', fontSize: '1.5rem' }}>
            👤 Basic Information
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
              gap: '1rem 2rem',
            }}
          >
            {/* Name */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="name" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Full Name <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="name"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'At least 2 characters required' },
                })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.name ? '2px solid #f87171' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s',
                }}
                placeholder="John Doe"
              />
              {errors.name && (
                <small style={{ color: '#f87171', marginTop: '0.25rem' }}>
                  {errors.name.message}
                </small>
              )}
            </div>

            {/* Age */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="age" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Age <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="age"
                type="number"
                {...register('age', {
                  required: 'Age is required',
                  min: { value: 0, message: 'Age must be positive' },
                  max: { value: 130, message: 'Enter a realistic age' },
                })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.age ? '2px solid #f87171' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s',
                }}
                placeholder="32"
              />
              {errors.age && (
                <small style={{ color: '#f87171', marginTop: '0.25rem' }}>{errors.age.message}</small>
              )}
            </div>

            {/* Blood Group */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="bloodGroup" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Blood Group <span style={{ color: '#f87171' }}>*</span>
              </label>
              <select
                id="bloodGroup"
                {...register('bloodGroup', { required: 'Select a blood group' })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.bloodGroup ? '2px solid #f87171' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s',
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Select
                </option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
              {errors.bloodGroup && (
                <small style={{ color: '#f87171', marginTop: '0.25rem' }}>
                  {errors.bloodGroup.message}
                </small>
              )}
            </div>

            {/* Weight */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="weight" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Weight (kg) <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="weight"
                type="number"
                step="0.1"
                {...register('weight', {
                  required: 'Weight is required',
                  min: { value: 1, message: 'Minimum 1 kg' },
                  max: { value: 350, message: 'Maximum 350 kg' },
                })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.weight ? '2px solid #f87171' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s',
                }}
                placeholder="70.5"
              />
              {errors.weight && (
                <small style={{ color: '#f87171', marginTop: '0.25rem' }}>
                  {errors.weight.message}
                </small>
              )}
            </div>

            {/* Height */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="height" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Height (cm) (optional)
              </label>
              <input
                id="height"
                type="number"
                step="0.1"
                {...register('height', {
                  min: { value: 40, message: 'Height seems too low' },
                  max: { value: 250, message: 'Height seems too high' },
                })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.height ? '2px solid #f87171' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s',
                }}
                placeholder="Optional"
              />
              {errors.height && (
                <small style={{ color: '#f87171', marginTop: '0.25rem' }}>
                  {errors.height.message}
                </small>
              )}
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="phone" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Phone Number <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone', {
                  required: 'Phone number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Phone number should be 10 digits',
                  },
                })}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.phone ? '2px solid #f87171' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                  transition: 'border-color 0.3s',
                }}
                placeholder="9876543210"
              />
              {errors.phone && (
                <small style={{ color: '#f87171', marginTop: '0.25rem' }}>{errors.phone.message}</small>
              )}
            </div>
          </div>
          {/* Address */}
          <div style={{ marginTop: '1.5rem' }}>
            <label htmlFor="address" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Address <span style={{ color: '#f87171' }}>*</span>
            </label>
            <textarea
              id="address"
              {...register('address', {
                required: 'Address is required',
                minLength: { value: 10, message: 'Address is too short' },
              })}
              rows={4}
              style={{
                width: '100%',
                borderRadius: '12px',
                border: errors.address ? '2px solid #f87171' : '2px solid transparent',
                padding: '0.75rem',
                fontFamily: "'Arial', sans-serif",
                fontSize: '1rem',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.3s',
              }}
              placeholder="Full address"
            />
            {errors.address && (
              <small style={{ color: '#f87171', marginTop: '0.5rem' }}>{errors.address.message}</small>
            )}
          </div>
        </section>

        {/* Allergies Card */}
        <section
          style={{
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '1.5rem',
            color: 'white',
            boxShadow: '0 10px 30px rgb(245 87 108 / 0.3)',
          }}
        >
          <h2 style={{ fontWeight: '700', fontSize: '1.5rem', marginBottom: '1rem' }}>
            ⚠️ Allergies & Medical Alerts
          </h2>
          <div>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Common Allergies
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))',
                gap: '0.65rem',
                color: 'white',
              }}
            >
              {COMMON_ALLERGIES.map((allergy) => (
                <label
                  key={allergy}
                  style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.95rem' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAllergies.includes(allergy)}
                    onChange={() => handleAllergyToggle(allergy)}
                    style={{
                      accentColor: '#ee6a6e',
                      marginRight: '0.35rem',
                    }}
                  />
                  {allergy}
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              gap: '0.75rem',
            }}
          >
            <input
              type="text"
              aria-label="Custom allergy input"
              placeholder="Add custom allergy"
              value={customAllergy}
              onChange={(e) => setCustomAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomAllergy();
                }
              }}
              style={{
                flexGrow: 1,
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '2px solid transparent',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.3s',
              }}
            />
            <button
              type="button"
              onClick={addCustomAllergy}
              style={{
                backgroundColor: 'white',
                color: '#f5576c',
                fontWeight: '600',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Add
            </button>
          </div>

          {selectedAllergies.length > 0 && (
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              {selectedAllergies.map((allergy) => (
                <div
                  key={allergy}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '20px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {allergy}
                  <button
                    type="button"
                    onClick={() => removeAllergy(allergy)}
                    aria-label={`Remove allergy ${allergy}`}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '1rem',
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Emergency Contact Card */}
        <section
          style={{
            background:
              'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: '#422800',
            boxShadow: '0 10px 30px rgb(251 191 36 / 0.3)',
          }}
        >
          <h2 style={{ fontWeight: '700', fontSize: '1.5rem', marginBottom: '1rem' }}>
            🚨 Emergency Contact
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
              gap: '1rem 2rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="emergencyName" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Contact Name
              </label>
              <input
                id="emergencyName"
                {...register('emergencyContact.name')}
                placeholder="Jane Doe"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="emergencyPhone" style={{ marginBottom: '0.25rem', fontWeight: '600' }}>
                Contact Phone
              </label>
              <input
                id="emergencyPhone"
                type="tel"
                {...register('emergencyContact.phone', {
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Phone should be 10 digits',
                  },
                })}
                placeholder="9876543210"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: errors.emergencyContact?.phone ? '2px solid #b91c1c' : '2px solid transparent',
                  outline: 'none',
                  fontSize: '1rem',
                }}
              />
              {errors.emergencyContact?.phone && (
                <span style={{color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.25rem'}}>
                  {errors.emergencyContact.phone.message}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Submit Section */}
        <section
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1.5rem',
            marginTop: '1rem',
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Cancel and lose all changes?')) {
                navigate('/dashboard');
              }
            }}
            disabled={loading}
            style={{
              backgroundColor: 'transparent',
              color: '#6b7280',
              fontWeight: '600',
              borderRadius: '8px',
              padding: '0.6rem 1.5rem',
              cursor: 'pointer',
              border: '2px solid #6b7280',
              transition: 'background-color 0.3s, color 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.6rem 2rem',
              backgroundColor: '#4338ca',
              color: 'white',
              fontWeight: '700',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'background-color 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading && (
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                style={{ width: '1.2rem', height: '1.2rem', marginRight: '5px' }}
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v0C5.373 4 0 9.373 0 16h4z"
                ></path>
              </svg>
            )}
            {loading ? 'Creating...' : 'Create Patient'}
          </button>
        </section>
      </form>
    </div>
  );
};

export default PatientForm;
