import React, { useState } from 'react';
import type { Medicine, PrescribedMedicine } from '../../services/types';
import MedicineSearch from './MedicineSearch';
import { MEDICINE_FREQUENCIES } from '../../utils/constants';

interface MedicineSelectorProps {
  onMedicineAdd: (medicine: PrescribedMedicine) => void;
}

const MedicineSelector: React.FC<MedicineSelectorProps> = ({ onMedicineAdd }) => {
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleMedicineSelect = (medicine: Medicine) => {
    setSelectedMedicine(medicine);
  };

  const handleAddMedicine = () => {
    if (!selectedMedicine || !dosage) {
      alert('Please select a medicine and enter dosage');
      return;
    }

    const prescribedMedicine: PrescribedMedicine = {
      medicineId: selectedMedicine.medicineId,
      medicineName: selectedMedicine.medicineName,
      dosage,
      frequency,
      duration
    };

    onMedicineAdd(prescribedMedicine);

    // Reset form
    setSelectedMedicine(null);
    setDosage('');
    setFrequency('');
    setDuration('');
    setInstructions('');
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Add Medicine</h3>
      
      <div className="space-y-4">
        {/* Medicine Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Medicine
          </label>
          <MedicineSearch
            onMedicineSelect={handleMedicineSelect}
            placeholder="Type medicine name..."
            value={selectedMedicine?.medicineName || ''}
          />
        </div>

        {/* Selected Medicine Info */}
        {selectedMedicine && (
          <div className="bg-blue-50 p-3 rounded-md">
            <h4 className="font-medium text-blue-900">{selectedMedicine.medicineName}</h4>
            <p className="text-sm text-blue-700">{selectedMedicine.composition}</p>
            <p className="text-xs text-blue-600 mt-1">{selectedMedicine.whenToUse}</p>
          </div>
        )}

        {/* Dosage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dosage *
            </label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g., 500mg, 1 tablet"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select frequency</option>
              {MEDICINE_FREQUENCIES.map((freq) => (
                <option key={freq} value={freq}>
                  {freq}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration and Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g., 7 days, 2 weeks"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Instructions
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Take with food"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Add Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAddMedicine}
            disabled={!selectedMedicine || !dosage}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Medicine
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicineSelector;
