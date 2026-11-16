import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { StaffRole } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty({ message: 'Full name is required.' })
  @MaxLength(150)
  fullName!: string;

  @IsEmail({}, { message: 'A valid email is required.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @MaxLength(254)
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Initial password must be at least 12 characters long.' })
  @MaxLength(72)
  password!: string;

  @IsEnum(StaffRole, { message: 'Invalid staff role provided.' })
  @IsNotEmpty()
  role!: StaffRole;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;
}
