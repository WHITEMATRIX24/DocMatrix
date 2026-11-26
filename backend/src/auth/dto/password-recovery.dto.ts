import { StrongPassword } from '../password.policy.js';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
export class RequestPasswordResetDto {
  @IsEmail() @MaxLength(254) email!: string;
}
export class CompletePasswordResetDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @IsString() @StrongPassword() password!: string;
}
