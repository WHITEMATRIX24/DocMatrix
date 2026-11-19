import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class UpdateBatchDto {
  @IsString() @IsNotEmpty() @MaxLength(100) itemId!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) batchNumber!: string;
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  newBatchNumber?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000) quantity?: number;
}
