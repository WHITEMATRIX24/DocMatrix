import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  @IsNotEmpty({ message: 'patientId is required.' })
  patientId!: string;

  @IsString()
  @IsOptional()
  doctorId?: string; // Optional: doctor can be assigned later or unassigned for triage queue

  @IsString()
  @IsOptional()
  doctorName?: string; // Optional doctor name for lookup if frontend passes name instead of UUID

  @IsString()
  @IsNotEmpty({ message: 'Date string (YYYY-MM-DD) is required.' })
  date!: string;

  @IsString()
  @IsNotEmpty({ message: 'Time string (HH:MM) is required.' })
  time!: string;

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
  status?: string; // e.g. 'scheduled', 'confirmed', 'checked-in'

  @IsString()
  @IsOptional()
  priority?: string; // 'normal', 'urgent', 'emergency'

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isWalkIn?: boolean;
}

