import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class LegacyTreatmentPlanItemDto {
  @IsOptional()
  @IsString()
  legacyId?: string; // e.g. 'TRT-1001'

  @IsString()
  patientId: string; // Patient code or UUID

  @IsString()
  procedure: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  toothNumber?: string;

  @IsOptional()
  @IsString()
  status?: string; // 'Proposed' | 'Accepted' | 'In Progress' | 'Pending' | 'Completed' | 'Declined'

  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  date?: string;
}

export class ImportLegacyPlansDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegacyTreatmentPlanItemDto)
  plans: LegacyTreatmentPlanItemDto[];
}

