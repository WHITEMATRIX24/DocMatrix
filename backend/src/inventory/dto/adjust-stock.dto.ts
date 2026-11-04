import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdjustStockDto {
  @IsNotEmpty()
  @IsString()
  itemId!: string;

  @IsNotEmpty()
  @IsString()
  batchNumber!: string;

  @IsInt()
  adjustmentAmount!: number; // can be positive (+50) or negative (-20)

  @IsOptional()
  @IsString()
  reason?: string;
}

