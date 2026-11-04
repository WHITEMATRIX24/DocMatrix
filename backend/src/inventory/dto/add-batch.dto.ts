import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class AddBatchDto {
  @IsNotEmpty()
  @IsString()
  itemId!: string;

  @IsNotEmpty()
  @IsString()
  batchNumber!: string;

  @IsNotEmpty()
  @IsString()
  expiryDate!: string; // 'YYYY-MM-DD'

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  location?: string;
}

