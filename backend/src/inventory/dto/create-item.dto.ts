import { IsNotEmpty, IsNumber, IsOptional, IsString, IsInt, Min, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';
class OpeningBatchDto {
  @IsString() @IsNotEmpty() batchNumber!: string;
  @IsString() @IsNotEmpty() expiryDate!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() location?: string;
}
export class CreateItemDto {
  @IsOptional() @ValidateNested() @Type(() => OpeningBatchDto) initialBatch?: OpeningBatchDto;

  @IsNotEmpty()
  @IsString()
  sku!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  category!: string;

  @IsNotEmpty()
  @IsString()
  unit!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalStock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;
}

