import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateEnquiryDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Request description is required.' })
  request!: string;

  @IsString()
  @IsOptional()
  status?: string; // 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'DISMISSED'

  @IsString()
  @IsOptional()
  notes?: string;
}
