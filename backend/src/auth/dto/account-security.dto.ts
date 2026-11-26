import { IsString, MaxLength, MinLength, Matches } from 'class-validator';
export class MfaBeginDto { @IsString() @MinLength(1) @MaxLength(256) password!: string; }
export class MfaCodeDto { @IsString() @Matches(/^(?:\d{6}|[a-f0-9]{20})$/) code!: string; }
export class VerifyEmailDto { @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string; }
