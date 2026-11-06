import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInvoiceLineItemDto {
  @IsOptional()
  @IsString()
  serviceTariffId?: string;

  @IsOptional()
  @IsString()
  treatmentPlanItemId?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  toothNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstRate?: number;
}

