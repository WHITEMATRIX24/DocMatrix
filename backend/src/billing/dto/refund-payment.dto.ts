import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class RefundPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

