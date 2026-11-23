import { IsIn } from 'class-validator';
import { IsOptional, IsString, IsTimeZone, ValidateNested, MaxLength } from 'class-validator';

import { Type } from 'class-transformer';
class WorkingHoursDto {
  @IsString() @MaxLength(100) weekdays!: string;
  @IsString() @MaxLength(100) saturday!: string;
  @IsString() @MaxLength(100) sunday!: string;
}
export class UpdateClinicDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsString()
  @IsOptional()
  registrationNumber?: string;

  @IsString()
  @IsOptional()
  gstin?: string;

  @IsTimeZone()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  practiceType?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkingHoursDto)
  workingHours?: WorkingHoursDto;

  @IsString()
  @IsOptional()
  @IsIn(['5','7','10','indefinite'])
  retentionAdult?: string;

  @IsString()
  @IsOptional()
  @IsIn(['21','25','indefinite'])
  retentionMinor?: string;
}
