import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTreatmentPlanItemDto {
  @IsOptional()
  @IsString()
  procedureCode?: string;

  @IsString()
  procedureName: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  toothNumber?: string;

  @IsOptional()
  @IsString()
  surface?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unitFee: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTreatmentPlanStageDto {
  @IsInt()
  @Min(1)
  stageNumber: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  targetDate?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentPlanItemDto)
  items: CreateTreatmentPlanItemDto[];
}

export class CreateTreatmentPlanDto {
  @IsString()
  patientId: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  clinicalNoteId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number; // e.g. 0, 5, 12, 18

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentPlanStageDto)
  stages: CreateTreatmentPlanStageDto[];
}

