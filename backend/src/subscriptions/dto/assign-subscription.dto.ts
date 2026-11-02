import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { BillingInterval } from '@prisma/client';

export class AssignSubscriptionDto {
  @IsString()
  @IsNotEmpty({ message: 'clinicId is required.' })
  clinicId!: string;

  @IsString()
  @IsNotEmpty({ message: 'planId is required.' })
  planId!: string;

  @IsEnum(BillingInterval)
  @IsOptional()
  billingInterval?: BillingInterval;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  lockedPrice?: number; // Optional custom/grandfathered price; defaults to Plan.basePrice

  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  trialDays?: number;
}

