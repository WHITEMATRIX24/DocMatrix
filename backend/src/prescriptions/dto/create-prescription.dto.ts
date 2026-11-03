import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePrescriptionItemDto {
  @IsString()
  @IsNotEmpty()
  medicineName!: string;

  @IsString()
  @IsOptional()
  strength?: string;

  @IsString()
  @IsNotEmpty()
  dosage!: string; // e.g., '1 tablet', '5 ml'

  @IsString()
  @IsOptional()
  route?: string = 'Oral'; // e.g., 'Oral', 'Topical', 'Sublingual'

  @IsString()
  @IsNotEmpty()
  frequency!: string; // e.g., '1-0-1', 'TID', 'PRN'

  @IsString()
  @IsNotEmpty()
  duration!: string; // e.g., '5 days', '1 week'

  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  instructions?: string; // e.g., 'Take after meals with warm water'
}

export class CreatePrescriptionDto {
  @IsUUID()
  @IsNotEmpty()
  patientId!: string;

  @IsUUID()
  @IsOptional()
  doctorId?: string; // If omitted, defaults to the authenticated doctor's ID

  @IsString()
  @IsNotEmpty()
  diagnosis!: string;

  @IsString()
  @IsOptional()
  clinicalNotes?: string;

  @IsString()
  @IsOptional()
  prescribedAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items!: CreatePrescriptionItemDto[];
}

