import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateEnquiryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail({}, { message: 'Must be a valid email address.' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  request?: string;

  @IsString()
  @IsIn(['PENDING', 'CONTACTED', 'CONVERTED', 'DISMISSED'], {
    message: 'Status must be PENDING, CONTACTED, CONVERTED, or DISMISSED.',
  })
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
