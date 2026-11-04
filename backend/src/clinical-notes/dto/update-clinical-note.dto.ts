import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateClinicalNoteDto {
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsDateString()
  consultationDate?: string;

  @IsOptional()
  @IsString()
  consultationType?: string;

  // Section 1: Chief Complaint
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  // Section 2: Symptoms & History
  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsString()
  symptomDuration?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painSeverity?: number;

  @IsOptional()
  @IsString()
  historyNotes?: string;

  // Section 3: Clinical Examination
  @IsOptional()
  @IsString()
  extraoralFindings?: string;

  @IsOptional()
  @IsString()
  intraoralFindings?: string;

  @IsOptional()
  @IsString()
  toothSpecificFindings?: string;

  @IsOptional()
  @IsString()
  periodontalFindings?: string;

  @IsOptional()
  @IsString()
  examinationNotes?: string;

  // Section 4: Diagnosis
  @IsOptional()
  @IsString()
  primaryDiagnosis?: string;

  @IsOptional()
  additionalDiagnoses?: any;

  @IsOptional()
  @IsString()
  diagnosisNotes?: string;

  // Section 5: Treatment Performed
  @IsOptional()
  @IsString()
  treatmentPerformed?: string;

  @IsOptional()
  @IsString()
  treatmentToothNumber?: string;

  @IsOptional()
  @IsString()
  treatmentDescription?: string;

  @IsOptional()
  @IsString()
  materialsUsed?: string;

  @IsOptional()
  @IsString()
  treatmentOutcome?: string;

  // Section 6: Treatment Recommendations
  @IsOptional()
  @IsString()
  treatmentRecommendations?: string;

  @IsOptional()
  @IsString()
  referralNotes?: string;

  // Section 7: Follow-up & Advice
  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  followUpInstructions?: string;

  @IsOptional()
  @IsString()
  patientAdvice?: string;
}
