import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConsentTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Template title is required.' })
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Procedure name is required.' })
  @MaxLength(150)
  procedureType!: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  procedureCategory?: string;

  @IsBoolean()
  @IsOptional()
  requiresConsent?: boolean;

  @IsBoolean()
  @IsOptional()
  guardianRequiredForMinors?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  purpose?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  benefits?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  risks?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  alternatives?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  refusalConsequences?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  postProcedureInstructions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  patientDeclaration?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  dentistDeclaration?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isReviewed?: boolean;
}

export class UpdateConsentTemplateDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  procedureType?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  procedureCategory?: string;

  @IsBoolean()
  @IsOptional()
  requiresConsent?: boolean;

  @IsBoolean()
  @IsOptional()
  guardianRequiredForMinors?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  purpose?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  benefits?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  risks?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  alternatives?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  refusalConsequences?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  postProcedureInstructions?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  patientDeclaration?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  dentistDeclaration?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  isReviewed?: boolean;
}
