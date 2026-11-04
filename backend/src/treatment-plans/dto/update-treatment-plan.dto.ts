import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTreatmentPlanStageDto } from './create-treatment-plan.dto.js';
import { TreatmentPlanStatus } from '@prisma/client';

export class UpdateTreatmentPlanDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(TreatmentPlanStatus)
  status?: TreatmentPlanStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTreatmentPlanStageDto)
  stages?: CreateTreatmentPlanStageDto[];

  @IsOptional()
  @IsString()
  revisionReason?: string;
}

