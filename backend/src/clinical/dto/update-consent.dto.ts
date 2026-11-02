import { IsOptional, IsString } from 'class-validator';

export class UpdateConsentDto {
  @IsString()
  @IsOptional()
  status?: string; // 'Signed' | 'Pending' | 'Declined'

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  witnessName?: string;

  @IsString()
  @IsOptional()
  signatureData?: string;
}

