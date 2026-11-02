import { IsOptional, IsString } from 'class-validator';

export class AppointmentQueryDto {
  @IsString()
  @IsOptional()
  date?: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  patientId?: string;
}

