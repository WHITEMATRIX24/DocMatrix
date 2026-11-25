import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum DentalReportType {
  CLINICAL_SUMMARY = 'CLINICAL_SUMMARY',
  CONSULTATION = 'CONSULTATION',
  TREATMENT = 'TREATMENT',
  EXAMINATION = 'EXAMINATION',
  PROGRESS = 'PROGRESS',
  REFERRAL = 'REFERRAL',
}

export class GenerateDentalReportDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsEnum(DentalReportType)
  reportType: DentalReportType;

  @IsOptional()
  @IsString()
  consultationId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  referralSpecialty?: string;

  @IsOptional()
  @IsString()
  referralReason?: string;

  @IsOptional()
  @IsString()
  referralDoctor?: string;

  @IsOptional()
  @IsString()
  referralClinic?: string;

  @IsOptional()
  @IsString()
  customNotes?: string;
}

export class SaveDentalReportDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsEnum(DentalReportType)
  reportType: DentalReportType;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  content: any;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  @IsString()
  consultationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
