import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreatePatientDto {
  @IsString()
  @IsOptional()
  patientCode?: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName!: string;

  @IsDateString({}, { message: 'Date of birth must be a valid date string (YYYY-MM-DD).' })
  @IsNotEmpty({ message: 'Date of birth is required.' })
  dateOfBirth!: string;

  @IsEnum(Gender, { message: 'Gender must be MALE, FEMALE, OTHER, or UNDISCLOSED.' })
  @IsOptional()
  gender?: Gender;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required.' })
  mobile!: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  emergencyName?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @IsString()
  @IsOptional()
  relationship?: string;

  @IsOptional()
  medicalSafetyAlerts?: any;
}

