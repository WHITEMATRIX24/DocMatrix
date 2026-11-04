import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TreatmentPlanItemStatus } from '@prisma/client';

export class UpdatePlanItemDto {
  @IsEnum(TreatmentPlanItemStatus)
  status: TreatmentPlanItemStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

