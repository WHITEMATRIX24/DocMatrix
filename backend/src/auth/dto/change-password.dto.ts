import { StrongPassword } from '../password.policy.js';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required.' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required.' })
  @MinLength(12, { message: 'New password must be at least 12 characters long.' })
  @StrongPassword()
  newPassword!: string;
}

