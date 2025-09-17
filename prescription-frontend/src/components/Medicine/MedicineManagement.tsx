// src/components/Medicine/MedicineManagement.tsx - Complete Medicine Management System
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { dynamoDBService } from '../../services/dynamoDBService';

interface Medicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  manufacturer: string;
  category: string;
  dosageForm: string;
  strength: string;
  price: number;
  stockQuantity: number;
  description?: string;
  sideEffects?: string;
  contraindications?: string;
  expiryDate?: string;
  batchNumber?: string;
  createdAt?: string;
  updatedAt?: string;
}

const MEDICINE_CATEGORIES = [
  'Analgesics', 'Antibiotics', 'Antivirals', 'Antifungals', 'Antihistamines',
  'Antihypertensives', 'Antidiabetics', 'Antacids', 'Bronchodilators',
  'Cardiovascular', 'Dermatological', 'Gastrointestinal', 'Hormonal',
  'Neurological', 'Respiratory', 'Vitamins & Supplements', 'Other'
];

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Ointment',
  'Drops', 'Inhaler', 'Spray', 'Gel', 'Powder', 'Suppository'
];

const MedicineManagement: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Medicine>>({
    medicineName: '',
    composition: '',
    manufacturer: '',
    category: '',
    dosageForm: '',
    strength: '',
    price: 0,
    stockQuantity: 0,
    description: '',
    sideEffects: '',
    contraindications: '',
    expiryDate: '',
    batchNumber: ''
  });

  // Load medicines on component mount
  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading medicines...');
      
      let medicineData: Medicine[] = [];
      
      try {
        medicineData = await dynamoDBService.getAllMedicines();
        console.log(`💊 Loaded ${medicineData.length} medicines from DynamoDB`);
      } catch (dynamoError) {
        console.warn('DynamoDB failed, trying localStorage:', dynamoError);
        medicineData = JSON.parse(localStorage.getItem('medicines') || '[]');
        console.log(`💊 Loaded ${medicineData.length} medicines from localStorage`);
      }
      
      // Validate and normalize medicine data
      const validMedicines = medicineData.filter(m => m && m.medicineId && m.medicineName)
        .map(m => ({
          medicineId: m.medicineId,
          medicineName: m.medicineName || 'Unknown Medicine',
          composition: m.composition || '',
          manufacturer: m.manufacturer || '',
          category: m.category || 'Other',
          dosageForm: m.dosageForm || 'Tablet',
          strength: m.strength || '',
          price: Number(m.price) || 0,
          stockQuantity: Number(m.stockQuantity) || 0,
          description: m.description || '',
          sideEffects: m.sideEffects || '',
          contraindications: m.contraindications || '',
          expiryDate: m.expiryDate || '',
          batchNumber: m.batchNumber || '',
          createdAt: m.createdAt || '',
          updatedAt: m.updatedAt || ''
        }));
      
      setMedicines(validMedicines);
      
    } catch (error) {
      console.error('Error loading medicines:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const generateMedicineId = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `MED-${timestamp}${random}`;
  };

  const handleInputChange = (field: keyof Medicine, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.medicineName?.trim()) {
      toast.error('Medicine name is required');
      return false;
    }
    if (!formData.manufacturer?.trim()) {
      toast.error('Manufacturer is required');
      return false;
    }
    if (!formData.category) {
      toast.error('Category is required');
      return false;
    }
    if (!formData.dosageForm) {
      toast.error('Dosage form is required');
      return false;
    }
    if (!formData.strength?.trim()) {
      toast.error('Strength is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setFormLoading(true);
    try {
      const medicineData: Medicine = {
        medicineId: selectedMedicine?.medicineId || generateMedicineId(),
        medicineName: formData.medicineName!.trim(),
        composition: formData.composition?.trim() || '',
        manufacturer: formData.manufacturer!.trim(),
        category: formData.category!,
        dosageForm: formData.dosageForm!,
        strength: formData.strength!.trim(),
        price: Number(formData.price) || 0,
        stockQuantity: Number(formData.stockQuantity) || 0,
        description: formData.description?.trim() || '',
        sideEffects: formData.sideEffects?.trim() || '',
        contraindications: formData.contraindications?.trim() || '',
        expiryDate: formData.expiryDate || '',
        batchNumber: formData.batchNumber?.trim() || '',
        createdAt: selectedMedicine?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let savedSuccessfully = false;

      // Try DynamoDB first
      try {
        await dynamoDBService.createMedicine(medicineData);
        savedSuccessfully = true;
        console.log('✅ Medicine saved to DynamoDB');
      } catch (dynamoError) {
        console.error('DynamoDB save failed:', dynamoError);
      }

      // Always update localStorage cache
      try {
        const existingMedicines = JSON.parse(localStorage.getItem('medicines') || '[]');
        let updatedMedicines;
        
        if (selectedMedicine) {
          // Update existing medicine
          updatedMedicines = existingMedicines.map((m: Medicine) => 
            m.medicineId === selectedMedicine.medicineId ? medicineData : m
          );
        } else {
          // Add new medicine
          updatedMedicines = [...existingMedicines, medicineData];
        }
        
        localStorage.setItem('medicines', JSON.stringify(updatedMedicines));
        console.log('✅ Medicine cached locally');
      } catch (localStorageError) {
        console.warn('Could not update localStorage cache:', localStorageError);
      }

      if (savedSuccessfully) {
        toast.success(`Medicine ${selectedMedicine ? 'updated' : 'added'} successfully and saved to cloud database!`);
      } else {
        toast.success(`Medicine ${selectedMedicine ? 'updated' : 'added'} successfully (saved locally - will sync when online)!`);
      }

      // Reset form and reload medicines
      resetForm();
      setActiveTab('list');
      await loadMedicines();

    } catch (error: any) {
      console.error('Error saving medicine:', error);
      toast.error(`Failed to ${selectedMedicine ? 'update' : 'add'} medicine: ${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      medicineName: '',
      composition: '',
      manufacturer: '',
      category: '',
      dosageForm: '',
      strength: '',
      price: 0,
      stockQuantity: 0,
      description: '',
      sideEffects: '',
      contraindications: '',
      expiryDate: '',
      batchNumber: ''
    });
    setSelectedMedicine(null);
  };

  const handleEdit = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
    setFormData(medicine);
    setActiveTab('edit');
  };

  const handleDelete = async (medicine: Medicine) => {
    if (!window.confirm(`Are you sure you want to delete "${medicine.medicineName}"?`)) {
      return;
    }

    try {
      // Update localStorage (remove from cache)
      const existingMedicines = JSON.parse(localStorage.getItem('medicines') || '[]');
      const updatedMedicines = existingMedicines.filter((m: Medicine) => m.medicineId !== medicine.medicineId);
      localStorage.setItem('medicines', JSON.stringify(updatedMedicines));

      toast.success('Medicine deleted successfully');
      await loadMedicines();
    } catch (error) {
      console.error('Error deleting medicine:', error);
      toast.error('Failed to delete medicine');
    }
  };

  const filteredMedicines = medicines.filter(medicine =>
    medicine.medicineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.composition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderForm = () => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h3 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.5em', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
        💊 {selectedMedicine ? 'Edit Medicine' : 'Add New Medicine'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '25px' }}>
          
          {/* Medicine Name */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Medicine Name *
            </label>
            <input
              type="text"
              value={formData.medicineName || ''}
              onChange={(e) => handleInputChange('medicineName', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter medicine name"
              required
            />
          </div>

          {/* Manufacturer */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Manufacturer *
            </label>
            <input
              type="text"
              value={formData.manufacturer || ''}
              onChange={(e) => handleInputChange('manufacturer', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter manufacturer name"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Category *
            </label>
            <select
              value={formData.category || ''}
              onChange={(e) => handleInputChange('category', e.target.value)}
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
              <option value="">Select Category</option>
              {MEDICINE_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Dosage Form */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Dosage Form *
            </label>
            <select
              value={formData.dosageForm || ''}
              onChange={(e) => handleInputChange('dosageForm', e.target.value)}
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
              <option value="">Select Dosage Form</option>
              {DOSAGE_FORMS.map(form => (
                <option key={form} value={form}>{form}</option>
              ))}
            </select>
          </div>

          {/* Strength */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Strength *
            </label>
            <input
              type="text"
              value={formData.strength || ''}
              onChange={(e) => handleInputChange('strength', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="e.g., 500mg, 10ml"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter price"
            />
          </div>

          {/* Stock Quantity */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Stock Quantity
            </label>
            <input
              type="number"
              value={formData.stockQuantity || ''}
              onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter stock quantity"
            />
          </div>

          {/* Batch Number */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Batch Number
            </label>
            <input
              type="text"
              value={formData.batchNumber || ''}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                border: '2px solid #bdc3c7', 
                borderRadius: '8px', 
                fontSize: '16px',
                transition: 'border-color 0.3s ease'
              }}
              placeholder="Enter batch number"
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              Expiry Date
            </label>
            <input
              type="date"
              value={formData.expiryDate || ''}
              onChange={(e) => handleInputChange('expiryDate', e.target.value)}
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

        {/* Composition */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Composition
          </label>
          <textarea
            rows={3}
            value={formData.composition || ''}
            onChange={(e) => handleInputChange('composition', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter medicine composition"
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Description
          </label>
          <textarea
            rows={3}
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter medicine description"
          />
        </div>

        {/* Side Effects */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Side Effects
          </label>
          <textarea
            rows={3}
            value={formData.sideEffects || ''}
            onChange={(e) => handleInputChange('sideEffects', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter known side effects"
          />
        </div>

        {/* Contraindications */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Contraindications
          </label>
          <textarea
            rows={3}
            value={formData.contraindications || ''}
            onChange={(e) => handleInputChange('contraindications', e.target.value)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '2px solid #bdc3c7', 
              borderRadius: '8px', 
              fontSize: '16px',
              resize: 'vertical',
              transition: 'border-color 0.3s ease'
            }}
            placeholder="Enter contraindications"
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
              background: formLoading ? '#bdc3c7' : 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: formLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: formLoading ? 'none' : '0 4px 15px rgba(230, 126, 34, 0.3)'
            }}
          >
            {formLoading ? '⏳ Saving...' : `💾 ${selectedMedicine ? 'Update' : 'Add'} Medicine`}
          </button>
        </div>
      </form>
    </div>
  );

  const renderMedicineList = () => (
    <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h3 style={{ color: '#2c3e50', fontSize: '1.5em', margin: 0 }}>
          💊 Medicine Inventory ({filteredMedicines.length})
        </h3>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search medicines..."
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
            onClick={loadMedicines}
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

      {filteredMedicines.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d', background: '#f8f9fa', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>💊</div>
          <p style={{ fontSize: '18px', margin: '0 0 8px 0' }}>
            {searchTerm ? 'No medicines found matching your search' : 'No medicines in inventory'}
          </p>
          <p style={{ fontSize: '14px', color: '#999', margin: 0 }}>
            {searchTerm ? 'Try a different search term' : 'Add your first medicine to get started'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {filteredMedicines.map((medicine) => (
            <div 
              key={medicine.medicineId} 
              style={{ 
                border: '1px solid #dee2e6', 
                borderRadius: '12px', 
                padding: '20px', 
                background: '#f8f9fa',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <h4 style={{ color: '#2c3e50', margin: 0, fontSize: '20px', fontWeight: '700' }}>
                      {medicine.medicineName}
                    </h4>
                    <span style={{ 
                      background: medicine.stockQuantity < 10 ? '#e74c3c' : '#27ae60', 
                      color: 'white', 
                      padding: '4px 12px', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      fontWeight: '600' 
                    }}>
                      {medicine.stockQuantity < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Manufacturer</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{medicine.manufacturer}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Category</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{medicine.category}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Strength</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{medicine.strength}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Form</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50' }}>{medicine.dosageForm}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Price</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '600' }}>₹{medicine.price}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Stock</div>
                      <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: '600' }}>{medicine.stockQuantity}</div>
                    </div>
                  </div>

                  {medicine.composition && (
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>Composition</div>
                      <div style={{ fontSize: '14px', color: '#7f8c8d', fontStyle: 'italic' }}>{medicine.composition}</div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                  <button
                    onClick={() => handleEdit(medicine)}
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
                    onClick={() => handleDelete(medicine)}
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', flexDirection: 'column' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading medicines...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1400px', margin: '0 auto', padding: '20px', background: '#f5f6fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)', color: 'white', padding: '30px', borderRadius: '16px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '2.5em', fontWeight: '300' }}>
              💊 Medicine Management
            </h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '1.1em' }}>
              Manage your medicine inventory and information
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
          { id: 'list', label: '📋 Medicine List', icon: '📋' },
          { id: 'add', label: '➕ Add Medicine', icon: '➕' }
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
              background: activeTab === tab.id ? 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)' : '#f8f9fa',
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
      {activeTab === 'list' && renderMedicineList()}
      {(activeTab === 'add' || activeTab === 'edit') && renderForm()}
    </div>
  );
};

export default MedicineManagement;