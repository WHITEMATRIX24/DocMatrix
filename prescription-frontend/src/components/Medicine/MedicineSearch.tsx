import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedApiService from '../../services/authenticatedApi';

interface Medicine {
  medicineId: string;
  medicineName: string;
  composition: string;
  whenToUse: string;
  sideEffects: string;
  category: string;
  manufacturer: string;
}

interface MedicineSearchProps {
  onMedicineSelect: (medicine: Medicine) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
}

const MedicineSearch: React.FC<MedicineSearchProps> = ({
  onMedicineSelect,
  placeholder = "Search for medicines...",
  initialValue = "",
  className = ""
}) => {
  const [query, setQuery] = useState(initialValue);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update query when initialValue changes
  useEffect(() => {
    setQuery(initialValue || '');
  }, [initialValue]);

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.length >= 2) {
        console.log('🔍 Searching for medicine:', query);
        searchMedicines(query);
      } else {
        setMedicines([]);
        setShowDropdown(false);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchMedicines = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await AuthenticatedApiService.searchMedicines(searchQuery);
      
      const medicineList = data.medicines || [];
      setMedicines(medicineList);
      setShowDropdown(true);
      
      if (medicineList.length === 0) {
        console.log('⚠️ No medicines found for query:', searchQuery);
      } else {
        console.log('✅ Found medicines:', medicineList.length);
      }
      
    } catch (err: any) {
      console.error('❌ Medicine search error:', err);
      setError(err.message);
      setMedicines([]);
      setShowDropdown(false);
      
      // If authentication error, the AuthenticatedApiService will handle it
      if (err.message.includes('Authentication') || err.message.includes('log in')) {
        // The user will be redirected to login automatically
        setError('Please log in to search medicines');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('✏️ Medicine search input changed:', value);
    setQuery(value);
    setError(null);
    
    if (value.length >= 2) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const handleMedicineSelect = (medicine: Medicine) => {
    console.log('🎯 Medicine selected:', medicine.medicineName);
    setQuery(medicine.medicineName);
    setShowDropdown(false);
    onMedicineSelect(medicine);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleFocus = () => {
    console.log('🔎 Medicine search focused, query length:', query.length);
    if (query.length >= 2 && medicines.length > 0) {
      setShowDropdown(true);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {loading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm z-50">
          <div className="font-medium">🔒 Authentication Error:</div>
          <div>{error}</div>
          {error.includes('log in') && (
            <div className="mt-2 text-xs">
              <strong>Solution:</strong> The page will reload to prompt for login.
            </div>
          )}
        </div>
      )}

      {showDropdown && medicines.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto z-50">
          <div className="p-2 bg-green-50 border-b text-xs text-green-700">
            🔐 Authenticated search: Found {medicines.length} medicine(s)
          </div>
          {medicines.map((medicine) => (
            <div
              key={medicine.medicineId}
              onClick={() => handleMedicineSelect(medicine)}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900">
                {medicine.medicineName}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {medicine.composition}
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {medicine.category}
                </span>
                <span className="text-xs text-gray-500">
                  {medicine.manufacturer}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && medicines.length === 0 && !loading && query.length >= 2 && !error && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white border border-gray-300 rounded-md shadow-lg text-gray-500 text-center z-50">
          <div>No medicines found for "{query}"</div>
          <div className="text-xs mt-1 text-gray-400">
            🔐 Authenticated search complete
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineSearch;
