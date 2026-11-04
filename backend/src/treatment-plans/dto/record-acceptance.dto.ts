import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AcceptanceMethod } from '@prisma/client';

export class RecordAcceptanceDto {
  @IsInt()
  @Min(1)
  versionNumber: number;

  @IsString()
  patientAcceptedByName: string;

  @IsEnum(AcceptanceMethod)
  acceptanceMethod: AcceptanceMethod;

  @IsOptional()
  @IsBoolean()
  isStaffRecorded?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

