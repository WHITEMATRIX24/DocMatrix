import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateConsentDto {
  @IsString()
  @IsNotEmpty({ message: 'Procedure name is required.' })
  @MaxLength(150)
  procedureName!: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  @IsOptional()
  treatmentPlanId?: string;

  @IsString()
  @IsOptional()
  consultationId?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  toothNumber?: string;

  @IsString()
  @IsOptional()
  treatmentArea?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'PENDING_SIGNATURE'])
  initialStatus?: 'DRAFT' | 'PENDING_SIGNATURE';
}

export class SubmitPatientSignatureDto {
  @IsString()
  @IsNotEmpty({ message: 'Patient signature data is required.' })
  @MaxLength(500000)
  signatureData!: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAW_MOUSE', 'DRAW_TOUCH', 'DRAW_STYLUS', 'STAFF_RECORDED'])
  signatureMethod?: string;

  @IsBoolean()
  accepted!: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class SubmitGuardianSignatureDto {
  @IsString()
  @IsNotEmpty({ message: 'Guardian name is required.' })
  @MaxLength(150)
  guardianName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Guardian relationship to patient is required.' })
  @MaxLength(100)
  guardianRelationship!: string;

  @IsBoolean()
  guardianAuthorized!: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Guardian signature data is required.' })
  @MaxLength(500000)
  signatureData!: string;

  @IsString()
  @IsOptional()
  @IsIn(['DRAW_MOUSE', 'DRAW_TOUCH', 'DRAW_STYLUS', 'STAFF_RECORDED'])
  signatureMethod?: string;

  @IsBoolean()
  accepted!: boolean;
}

export class VerifyConsentDto {
  @IsString()
  @IsNotEmpty({ message: 'Dentist signature or approval is required.' })
  @MaxLength(500000)
  dentistSignature!: string;

  @IsBoolean()
  @IsOptional()
  markCompleted?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class DeclineConsentDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}

export class CancelConsentDto {
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;
}
