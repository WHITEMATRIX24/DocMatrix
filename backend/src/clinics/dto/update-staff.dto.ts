import { IsBoolean, IsEnum, ValidateIf, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { StaffRole } from '@prisma/client';

export class UpdateStaffDto {
  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @IsEnum(StaffRole, { message: 'Invalid staff role provided.' })
  @ValidateIf((_object, value) => value !== undefined)
  role?: StaffRole;

  @IsString()
  @ValidateIf((_object, value) => value !== undefined)
  @MaxLength(40)
  phone?: string;

  @IsBoolean()
  @ValidateIf((_object, value) => value !== undefined)
  isActive?: boolean;
}
