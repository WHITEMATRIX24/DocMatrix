import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { GstClass } from '@prisma/client';

export class CreateTariffDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  standardFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number; // Alias for standardFee

  @IsOptional()
  @IsNumber()
  @Min(0)
  offerPrice?: number;

  @IsOptional()
  @IsEnum(GstClass)
  gstClass?: GstClass;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

