import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class UpdatePlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  basePrice?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultTrialDays?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  maxUsers?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

