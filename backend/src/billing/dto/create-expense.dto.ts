import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ExpenseCategory, PaymentMode } from '@prisma/client';

export class CreateExpenseDto {
  @IsString()
  date: string; // YYYY-MM-DD

  @IsString()
  category: string; // Accepts enum string or frontend category label

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode;

  @IsOptional()
  @IsString()
  reference?: string;
}

