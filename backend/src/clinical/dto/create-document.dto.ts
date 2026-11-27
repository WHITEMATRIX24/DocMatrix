import { Transform } from 'class-transformer';
import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  MaxLength,
  IsDateString,
  IsArray,
  IsInt,
  ArrayUnique,
  ArrayMaxSize,
} from 'class-validator';

export const DOCUMENT_CATEGORIES = [
  'Dental X-rays',
  'Clinical Photographs',
  'Medical Reports',
  'Dental Reports',
  'Scanned Documents',
  'Prescriptions',
  'Other Documents',
  'Radiology',
  'Intraoral Photo',
  'Lab Report',
  'Prescription',
  'Consent',
  'Other',
  'Identification',
  'Referral',
];
export const ADULT_TEETH = [
  11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33,
  34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
];
export class CreateDocumentDto {
  @IsOptional() @IsUUID() uploadRequestId?: string;
  @IsOptional() @IsString() @MaxLength(100) appointmentId?: string;
  @IsOptional() @IsIn(['IOPA', 'OPG', 'CBCT', 'Other']) imagingType?: string;
  @IsOptional()
  @IsIn([
    'Before Treatment',
    'During Treatment',
    'After Treatment',
    'General Clinical Photograph',
  ])
  photographClass?: string;
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(32)
  @IsInt({ each: true })
  @IsIn(ADULT_TEETH, { each: true })
  toothNumbers?: number[];
  @IsOptional() @IsString() @MaxLength(2000) treatmentContext?: string;
  @IsOptional() @IsDateString() documentDate?: string;

  @IsString()
  @IsNotEmpty({ message: 'Document title is required.' })
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required.' })
  @IsIn(DOCUMENT_CATEGORIES)
  category!: string; // 'Radiology' | 'Intraoral Photo' | 'Lab Report' | 'Prescription' | 'Consent' | 'Other'

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  fileSize?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(10000)
  notes?: string;

  @IsString()
  @IsOptional()
  contentBase64?: string;
}
