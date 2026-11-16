import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NewPatientPage from '../src/pages/patients/NewPatientPage';
import { resetStoreForTesting } from '../src/services/clinicStore';

describe('Emergency Contact Form Readability & Theme Harmony', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
  });

  const navigateToStep1 = () => {
    render(
      <MemoryRouter initialEntries={['/patients/new']}>
        <NewPatientPage />
      </MemoryRouter>
    );

    // Step 0: Fill minimum required fields to proceed to Step 1
    const firstNameInput = screen.getByPlaceholderText(/Enter first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Anita' } });

    const ageInput = screen.getByLabelText(/Age in years/i);
    fireEvent.change(ageInput, { target: { value: '28' } });

    const genderSelect = screen.getByRole('combobox', { name: /Gender \*/i });
    fireEvent.change(genderSelect, { target: { value: 'Female' } });

    const mobileInput = screen.getByPlaceholderText(/Enter mobile number/i);
    fireEvent.change(mobileInput, { target: { value: '9876543210' } });

    // Click Continue
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    fireEvent.click(continueBtn);
  };

  it('renders Emergency Contact Person section with heading, icon, and explanation', () => {
    navigateToStep1();

    // Verify section heading
    expect(screen.getByRole('heading', { level: 3, name: /Emergency contact person/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Required so the clinic can contact someone in an emergency/i)
    ).toBeInTheDocument();

    // Verify container class
    const emergencySection = document.querySelector('.patient-intake-emergency');
    expect(emergencySection).toBeInTheDocument();
  });

  it('renders all three emergency contact fields with clear labels and contrast markers', () => {
    navigateToStep1();

    const emergencySection = document.querySelector('.patient-intake-emergency');
    expect(emergencySection).toBeInTheDocument();

    // Field 1: Contact person name
    const nameLabel = screen.getByText(/Contact person name/i);
    expect(nameLabel).toBeInTheDocument();
    const nameInput = screen.getByPlaceholderText(/Enter contact name/i);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toBeRequired();

    // Field 2: Emergency phone number
    const phoneLabel = screen.getByText(/Emergency phone number/i);
    expect(phoneLabel).toBeInTheDocument();
    const phoneInput = screen.getByPlaceholderText(/Enter phone number/i);
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).toBeRequired();
    expect(phoneInput).toHaveAttribute('type', 'tel');

    // Field 3: Relationship (Optional)
    const relLabel = screen.getByText(/^Relationship/i);
    expect(relLabel).toBeInTheDocument();
    expect(within(emergencySection).getByText(/Optional/i)).toBeInTheDocument();
    const relSelect = screen.getByRole('combobox', { name: /Relationship/i });
    expect(relSelect).toBeInTheDocument();
    expect(relSelect).not.toBeRequired();

    // Check relationship options
    expect(screen.getByRole('option', { name: /Select relationship/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Parent/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Spouse/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Sibling/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Child/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Friend/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Other/i })).toBeInTheDocument();
  });

  it('allows user to enter values, select options, and preserves inputs across interactions', () => {
    navigateToStep1();

    const nameInput = screen.getByPlaceholderText(/Enter contact name/i);
    const phoneInput = screen.getByPlaceholderText(/Enter phone number/i);
    const relSelect = screen.getByRole('combobox', { name: /Relationship/i });

    // Enter values
    fireEvent.change(nameInput, { target: { value: 'Rajesh Kumar' } });
    fireEvent.change(phoneInput, { target: { value: '9840123456' } });
    fireEvent.change(relSelect, { target: { value: 'Spouse' } });

    expect(nameInput).toHaveValue('Rajesh Kumar');
    expect(phoneInput).toHaveValue('9840123456');
    expect(relSelect).toHaveValue('Spouse');
  });

  it('maintains integrity and accessibility when dark mode is toggled', () => {
    // Set dark mode
    document.documentElement.setAttribute('data-theme', 'dark');

    navigateToStep1();

    const emergencySection = document.querySelector('.patient-intake-emergency');
    expect(emergencySection).toBeInTheDocument();

    // Verify all 3 inputs and their labels are present and properly queried in dark mode
    const nameInput = screen.getByPlaceholderText(/Enter contact name/i);
    const phoneInput = screen.getByPlaceholderText(/Enter phone number/i);
    const relSelect = screen.getByRole('combobox', { name: /Relationship/i });

    fireEvent.change(nameInput, { target: { value: 'Dr. Suresh' } });
    fireEvent.change(phoneInput, { target: { value: '9123456789' } });
    fireEvent.change(relSelect, { target: { value: 'Parent' } });

    expect(nameInput).toHaveValue('Dr. Suresh');
    expect(phoneInput).toHaveValue('9123456789');
    expect(relSelect).toHaveValue('Parent');

    // Toggle to light mode
    document.documentElement.setAttribute('data-theme', 'light');

    expect(nameInput).toHaveValue('Dr. Suresh');
    expect(phoneInput).toHaveValue('9123456789');
    expect(relSelect).toHaveValue('Parent');
  });
});

