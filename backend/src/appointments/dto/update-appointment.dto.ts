import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAppointmentDto {
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

