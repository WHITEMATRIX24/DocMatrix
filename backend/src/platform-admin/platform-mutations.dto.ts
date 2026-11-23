import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
export class ClinicStatusDto {
  @IsIn(['ACTIVE', 'TRIAL', 'SUSPENDED', 'READ_ONLY', 'CLOSED']) status!: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'READ_ONLY' | 'CLOSED';
  @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
}
export class PractitionerVerificationDto {
  @IsBoolean() verified!: boolean;
  @IsOptional() @IsString() @MaxLength(150) registration?: string;
  @IsString() @MinLength(5) @MaxLength(1000) reason!: string;
}
