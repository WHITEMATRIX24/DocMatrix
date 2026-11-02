import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterClinicDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Clinic name is required.' })
  clinicName!: string;

  @IsEmail({}, { message: 'A valid email is required.' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required.' })
  mobile!: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  practiceType?: string;
}

