import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class CollectionQueryDto {
  @IsOptional()
  @IsString()
  date?: string; // e.g. YYYY-MM-DD

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode;
}

