import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpfrontPaymentDto } from './issue-invoice.dto.js';

export class InvoiceFromTreatmentPlanDto {
  @IsString()
  treatmentPlanId: string;

  @IsOptional()
  @IsString()
  stageId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  itemIds?: string[];

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsBoolean()
  issueImmediately?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpfrontPaymentDto)
  upfrontPayment?: UpfrontPaymentDto;
}

