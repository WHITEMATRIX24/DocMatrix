import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateConsentDto {
  @IsString()
  @IsOptional()
  @IsIn(['Signed', 'Pending', 'Declined', 'Revoked'])
  status?: string;

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

