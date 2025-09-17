export const BLOOD_GROUPS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];

export const MEDICINE_FREQUENCIES = [
  'Once daily',
  'Twice daily', 
  'Three times daily',
  'Four times daily',
  'As needed',
  'Before meals',
  'After meals',
  'At bedtime'
];

export const MEDICINE_DURATIONS = [
  '3 days',
  '5 days',
  '7 days',
  '10 days',
  '14 days',
  '1 month',
  'As needed'
];

export const API_ENDPOINTS = {
  MEDICINES_SEARCH: '/medicines/search',
  PRESCRIPTIONS: '/prescriptions',
  PATIENTS: '/patients',
  AUTH: '/auth'
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PRESCRIPTIONS: '/prescriptions',
  NEW_PRESCRIPTION: '/prescriptions/new',
  PATIENTS: '/patients'
} as const;