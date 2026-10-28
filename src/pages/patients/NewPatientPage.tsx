import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { registerPatient, type PatientRecord } from '@/services/clinicStore'

const steps = [
  { title: 'Personal identification', subtitle: 'Patient identity and contact details' },
  { title: 'Contact & emergency safety', subtitle: 'Location and emergency contact' },
  { title: 'Medical history screening', subtitle: 'Health details for safe dental care' }
]

type MedicalAnswer = '' | 'yes' | 'no' | 'unknown'

const MedicalQuestion: React.FC<{
  name: string
  title: string
  description: string
  value: MedicalAnswer
  onChange: (value: MedicalAnswer) => void
}> = ({ name, title, description, value, onChange }) => (
  <fieldset className="patient-intake-question">
    <div className="patient-intake-question-copy">
      <legend>{title} <span className="patient-intake-required">*</span></legend>
      <p>{description}</p>
      {value === 'yes' && (
        <label className="patient-intake-field patient-intake-question-details">
          <span>Please provide details <b>*</b></span>
          <input name={`${name}Details`} placeholder="Add details" required />
        </label>
      )}
    </div>
    <div className="patient-intake-choice-group" role="radiogroup" aria-label={title}>
      {(['yes', 'no', 'unknown'] as const).map((answer) => (
        <label key={answer} className={`patient-intake-choice${value === answer ? ' is-selected' : ''}`}>
          <input type="radio" name={name} value={answer} checked={value === answer} onChange={() => onChange(answer)} required />
          {answer[0].toUpperCase() + answer.slice(1)}
        </label>
      ))}
    </div>
  </fieldset>
)

export const NewPatientPage: React.FC = () => {
  const [step, setStep] = useState(0)
  const [dob, setDob] = useState('')
  const [age, setAge] = useState('')
  const [allergies, setAllergies] = useState<MedicalAnswer>('')
  const [medications, setMedications] = useState<MedicalAnswer>('')
  const [conditions, setConditions] = useState<MedicalAnswer>('')
  const [registeredPatient, setRegisteredPatient] = useState<PatientRecord | null>(null)
  const stepContent = useRef<HTMLDivElement>(null)

  const validateCurrentStep = () => {
    if (!stepContent.current) return false
    const activePanel = stepContent.current.querySelector<HTMLElement>(`.patient-intake-step-panel[data-step="${step}"]`)
    const fields = Array.from(activePanel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':required') || [])
    const invalid = fields.find((field) => !field.checkValidity())
    if (invalid) {
      invalid.reportValidity()
      return false
    }
    if (step === 0 && !dob && !age) {
      const dobField = activePanel?.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')
      dobField?.setCustomValidity('Enter a date of birth or an age.')
      dobField?.reportValidity()
      dobField?.addEventListener('input', () => dobField.setCustomValidity(''), { once: true })
      return false
    }
    return true
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateCurrentStep()) return
    const values = new FormData(event.currentTarget)
    const value = (key: string) => String(values.get(key) || '').trim()
    setRegisteredPatient(registerPatient({
      firstName: value('firstName'), lastName: value('lastName'), age: value('age'), dateOfBirth: value('dateOfBirth'),
      gender: value('gender'), mobile: value('mobile'), countryCode: value('countryCode'), email: value('email'),
      language: value('language'), city: value('city'), state: value('state'), postalCode: value('postalCode'),
      address: value('address'), emergencyName: value('emergencyName'), emergencyPhone: value('emergencyPhone'),
      relationship: value('relationship'), allergies: value('allergies') as PatientRecord['allergies'],
      allergiesDetails: value('allergiesDetails'), medications: value('medications') as PatientRecord['medications'],
      medicationsDetails: value('medicationsDetails'), conditions: value('conditions') as PatientRecord['conditions'],
      conditionsDetails: value('conditionsDetails')
    }))
  }

  return (
    <section className="patient-intake" data-testid="feature-page-pat.new">
      <header className="patient-intake-banner">
        <div>
          <span className="patient-intake-eyebrow">PATIENTS</span>
          <h1>New patient registration</h1>
          <p>Complete the required details to create a patient record.</p>
        </div>
        <span className="patient-intake-mandatory"><i /> Required fields</span>
      </header>

      {registeredPatient ? (
        <div className="patient-intake-complete" role="status">
          <CheckCircle2 size={34} />
          <h2>Patient registered in this session</h2>
          <p>{registeredPatient.firstName} {registeredPatient.lastName} · {registeredPatient.id}. This prototype keeps records only until the page is refreshed.</p>
          <div className="patient-intake-complete-actions">
            <Link className="patient-intake-secondary" to={`/patients/${registeredPatient.id}`}>Open patient record</Link>
            <Link className="patient-intake-primary" to={`/appointments/new?patientId=${registeredPatient.id}`}>Book appointment</Link>
            <button type="button" className="patient-intake-secondary" onClick={() => { setRegisteredPatient(null); setStep(0) }}>Register another</button>
          </div>
        </div>
      ) : (
        <form className="patient-intake-card" onSubmit={handleSubmit} noValidate>
          <nav className="patient-intake-progress" aria-label="Registration steps">
            {steps.map((item, index) => (
              <div key={item.title} className={`patient-intake-progress-step${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}>
                <span className="patient-intake-step-number">{index < step ? <CheckCircle2 size={16} /> : index + 1}</span>
                <span className="patient-intake-progress-label"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
              </div>
            ))}
          </nav>

          <div className="patient-intake-content" ref={stepContent}>
            <div className="patient-intake-section-heading">
              <div><span className="patient-intake-section-number">{step + 1}</span><div><h2>{steps[step].title}</h2><p>{steps[step].subtitle}</p></div></div>
              <span>Step {step + 1} of {steps.length}</span>
            </div>

            <div className="patient-intake-step-panel" data-step="0" hidden={step !== 0}>
              <div className="patient-intake-fields">
                <div className="patient-intake-id"><span>Patient ID</span><strong>Assigned when registration is saved</strong><small>System generated</small></div>
                <div className="patient-intake-grid">
                  <label className="patient-intake-field"><span>First name <b>*</b></span><input name="firstName" autoComplete="given-name" placeholder="Enter first name" required /></label>
                  <label className="patient-intake-field"><span>Last name / surname</span><input name="lastName" autoComplete="family-name" placeholder="Enter last name" /></label>
                  <div className="patient-intake-field patient-intake-field-wide"><span>Age or date of birth <b>*</b></span><div className="patient-intake-inline-inputs">
                    <input name="dateOfBirth" type="date" aria-label="Date of birth" max={new Date().toISOString().slice(0, 10)} value={dob} onChange={(event) => { setDob(event.target.value); event.target.setCustomValidity('') }} />
                    <input name="age" type="number" min="0" max="130" aria-label="Age in years" placeholder="Age in years" value={age} onChange={(event) => { setAge(event.target.value); stepContent.current?.querySelector<HTMLInputElement>('input[name="dateOfBirth"]')?.setCustomValidity('') }} />
                  </div><small>Enter either date of birth or age.</small></div>
                  <label className="patient-intake-field"><span>Gender <b>*</b></span><select name="gender" defaultValue="" required><option value="" disabled>Select gender</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
                  <label className="patient-intake-field"><span>Primary mobile number <b>*</b></span><div className="patient-intake-inline-inputs patient-intake-phone"><select aria-label="Country calling code" name="countryCode" defaultValue="+91"><option value="+91">+91 (IN)</option><option value="+1">+1</option><option value="+44">+44</option><option value="+971">+971</option></select><input name="mobile" type="tel" autoComplete="tel-national" placeholder="Enter mobile number" required /></div></label>
                  <label className="patient-intake-field"><span>Email address <small>Optional</small></span><input name="email" type="email" autoComplete="email" placeholder="name@example.com" /></label>
                  <label className="patient-intake-field"><span>Communication language <small>Optional</small></span><select name="language" defaultValue="English"><option>English</option><option>Malayalam</option><option>Tamil</option><option>Hindi</option><option>Other</option></select></label>
                </div>
              </div>
            </div>

            <div className="patient-intake-step-panel" data-step="1" hidden={step !== 1}>
              <div className="patient-intake-fields">
                <div className="patient-intake-grid patient-intake-grid-three">
                  <label className="patient-intake-field"><span>City / town <b>*</b></span><input name="city" autoComplete="address-level2" placeholder="Enter city or town" required /></label>
                  <label className="patient-intake-field"><span>State <small>Optional</small></span><input name="state" autoComplete="address-level1" placeholder="Enter state" /></label>
                  <label className="patient-intake-field"><span>PIN code <small>Optional</small></span><input name="postalCode" autoComplete="postal-code" inputMode="numeric" placeholder="Enter PIN code" /></label>
                  <label className="patient-intake-field patient-intake-field-wide"><span>Residential / street address <small>Optional</small></span><input name="address" autoComplete="street-address" placeholder="Flat, building, street, or landmark" /></label>
                </div>
                <section className="patient-intake-emergency">
                  <h3><ShieldCheck size={17} /> Emergency contact person</h3>
                  <p>Required so the clinic can contact someone in an emergency.</p>
                  <div className="patient-intake-grid patient-intake-grid-three">
                    <label className="patient-intake-field"><span>Contact person name <b>*</b></span><input name="emergencyName" placeholder="Enter contact name" required /></label>
                    <label className="patient-intake-field"><span>Emergency phone number <b>*</b></span><input name="emergencyPhone" type="tel" placeholder="Enter phone number" required /></label>
                    <label className="patient-intake-field"><span>Relationship <small>Optional</small></span><select name="relationship" defaultValue=""><option value="">Select relationship</option><option>Parent</option><option>Spouse</option><option>Sibling</option><option>Child</option><option>Friend</option><option>Other</option></select></label>
                  </div>
                </section>
              </div>
            </div>

            <div className="patient-intake-step-panel" data-step="2" hidden={step !== 2}>
              <div className="patient-intake-fields">
                <div className="patient-intake-clinical-note"><ShieldCheck size={18} /><p><strong>Clinical safety note</strong><br />Unknown means the history has not been confirmed. The dental team should review unknown or reported risks before treatment.</p></div>
                <div className="patient-intake-questions">
                  <MedicalQuestion name="allergies" title="Known allergies" description="Include medicines, local anesthetics, latex, or other allergies." value={allergies} onChange={setAllergies} />
                  <MedicalQuestion name="medications" title="Current medications" description="Include regular and recent medicines or supplements." value={medications} onChange={setMedications} />
                  <MedicalQuestion name="conditions" title="Existing medical conditions" description="Include conditions that may affect dental treatment or anesthesia." value={conditions} onChange={setConditions} />
                </div>
              </div>
            </div>
          </div>

          <footer className="patient-intake-actions">
            <span>* Required to continue</span>
            {step > 0 && <button type="button" className="patient-intake-secondary" onClick={() => setStep(step - 1)}><ArrowLeft size={15} /> Back</button>}
            {step < steps.length - 1
              ? <button type="button" className="patient-intake-primary" onClick={() => { if (validateCurrentStep()) setStep(step + 1) }}>Continue <ArrowRight size={15} /></button>
              : <button type="button" className="patient-intake-primary" onClick={() => { if (validateCurrentStep()) document.querySelector<HTMLFormElement>('.patient-intake-card')?.requestSubmit() }}>Complete registration <CheckCircle2 size={15} /></button>}
          </footer>
        </form>
      )}
    </section>
  )
}

export default NewPatientPage
