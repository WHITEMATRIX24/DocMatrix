import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewPatientPage from '../src/pages/patients/NewPatientPage';
import { resetStoreForTesting, computeAgeFromDob, registerPatient, getClinicData } from '../src/services/clinicStore';

describe('Patient Registration: Age Directly Calculated from DOB', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
  });

  afterEach(() => {
    cleanup();
  });

  it('calculates the exact age when Date of Birth is selected in the UI', () => {
    render(
      <MemoryRouter initialEntries={['/patients/new']}>
        <NewPatientPage />
      </MemoryRouter>
    );

    const dobInput = screen.getByLabelText(/Date of birth/i);
    const ageInput = screen.getByLabelText(/Age in years/i);

    // Pick DOB: 1995-06-15
    fireEvent.change(dobInput, { target: { value: '1995-06-15' } });

    const expectedAge = computeAgeFromDob('1995-06-15');
    expect(ageInput.value).toBe(expectedAge);
    expect(ageInput).toHaveAttribute('readonly');
    expect(screen.getByText(new RegExp(`Age: ${expectedAge} years \\(directly calculated from Date of Birth\\)`, 'i'))).toBeInTheDocument();
  });

  it('updates the calculated age immediately when DOB is changed', () => {
    render(
      <MemoryRouter initialEntries={['/patients/new']}>
        <NewPatientPage />
      </MemoryRouter>
    );

    const dobInput = screen.getByLabelText(/Date of birth/i);
    const ageInput = screen.getByLabelText(/Age in years/i);

    // Change to a child DOB
    fireEvent.change(dobInput, { target: { value: '2016-03-20' } });
    const childAge = computeAgeFromDob('2016-03-20');
    expect(ageInput.value).toBe(childAge);

    // Change to a senior DOB
    fireEvent.change(dobInput, { target: { value: '1955-11-05' } });
    const seniorAge = computeAgeFromDob('1955-11-05');
    expect(ageInput.value).toBe(seniorAge);
  });

  it('registers patient and stores age calculated directly from DOB in clinicStore', () => {
    const patient = registerPatient({
      firstName: 'Priya',
      lastName: 'Nair',
      age: '99', // Stale or mismatched manual input
      dateOfBirth: '2000-08-15',
      gender: 'female',
      mobile: '9876543210',
      countryCode: '+91',
      email: 'priya.nair@example.com',
      language: 'English',
      city: 'Kochi',
      state: 'Kerala',
      postalCode: '682001',
      address: 'Marine Drive',
      emergencyName: 'Ramesh Nair',
      emergencyPhone: '9876543211',
      relationship: 'Spouse',
      allergies: 'no',
      allergiesDetails: '',
      medications: 'no',
      medicationsDetails: '',
      conditions: 'no',
      conditionsDetails: ''
    });

    const expectedAge = computeAgeFromDob('2000-08-15');
    expect(patient.age).toBe(expectedAge);
    expect(patient.age).not.toBe('99');
  });
});

