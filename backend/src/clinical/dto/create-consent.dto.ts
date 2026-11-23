import { IsIn, MaxLength } from 'class-validator';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConsentDto {
  @IsOptional() @IsString() @MaxLength(20000) consentText?: string;
  @IsString()
  @IsNotEmpty({ message: 'Consent type is required.' })
  consentType!: string;

  @IsString()
  @IsOptional()
  @IsIn(['Signed', 'Pending', 'Declined'])
  status?: string; // 'Signed' | 'Pending' | 'Declined'

  @IsDateString({}, { message: 'dateRecorded must be a valid ISO date string.' })
  @IsOptional()
  dateRecorded?: string;

  @IsString()
  @IsOptional()
  recordedBy?: string;

  @IsString()
  @IsOptional()
  documentRef?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  witnessName?: string;

  @IsString()
  @IsOptional()
  signatureData?: string;
}

