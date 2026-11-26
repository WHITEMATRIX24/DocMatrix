import { IsBoolean, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateAppointmentDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  expectedRevision?: number;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  time?: string;

  @IsInt()
  @Min(5)
  @Max(1440)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  chair?: string;

  @IsString()
  @IsOptional()
  treatmentType?: string;

  @IsString()
  @IsOptional()
  visitType?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isWalkIn?: boolean;

  @IsString()
  @IsOptional()
  cancellationReason?: string;
}

