import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required.' })
  fullName!: string;

  @IsEmail({}, { message: 'A valid email is required.' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Initial password must be at least 8 characters long.' })
  password!: string;

  @IsEnum(StaffRole, { message: 'Invalid staff role provided.' })
  @IsNotEmpty()
  role!: StaffRole;

  @IsString()
  @IsOptional()
  phone?: string;
}

