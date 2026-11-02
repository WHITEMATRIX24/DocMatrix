import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class PlanFeatureInputDto {
  @IsString()
  @IsNotEmpty()
  featureKey!: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  limitValue?: number;
}

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty({ message: 'Plan name is required.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Plan slug is required.' })
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;

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

  @IsArray()
  @IsOptional()
  features?: PlanFeatureInputDto[];
}

