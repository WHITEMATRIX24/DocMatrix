import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'Document title is required.' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required.' })
  category!: string; // 'Radiology' | 'Intraoral Photo' | 'Lab Report' | 'Prescription' | 'Consent' | 'Other'

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  fileSize?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  contentBase64?: string;
}

