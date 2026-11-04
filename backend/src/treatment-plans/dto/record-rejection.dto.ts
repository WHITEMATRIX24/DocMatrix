import { IsOptional, IsString } from 'class-validator';

export class RecordRejectionDto {
  @IsString()
  rejectionReason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

