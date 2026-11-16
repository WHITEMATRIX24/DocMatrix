import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { StaffRole } from '@prisma/client';

export class UpdateStaffDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @Transform(({ value }) => (value === 'STAFF' ? StaffRole.NURSE : value))
  @IsEnum(StaffRole, { message: 'Invalid staff role provided.' })
  @IsOptional()
  role?: StaffRole;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
