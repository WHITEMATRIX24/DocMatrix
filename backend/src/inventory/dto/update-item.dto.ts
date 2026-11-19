import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class UpdateItemDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40) unit?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000000000) reorderLevel?: number;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  costPerUnit?: number;
}
