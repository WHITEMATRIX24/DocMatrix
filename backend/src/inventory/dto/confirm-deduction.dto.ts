import { IsArray, IsNotEmpty, IsOptional, IsString, IsInt, Min, Max, MaxLength, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DeductedMaterialItemDto {
  @IsString() @IsNotEmpty() @MaxLength(100)
  itemId!: string;
  @IsString() @IsOptional() @MaxLength(200)
  name!: string;
  @IsString() @IsOptional() @MaxLength(200)
  unit!: string;
  @IsInt() @Min(0) @Max(1000000000) @IsOptional()
  suggestedQty?: number;
  @IsInt() @Min(0) @Max(1000000000)
  confirmedQty!: number;
  @IsInt() @Min(0) @Max(1000000000) @IsOptional()
  wastageQty?: number;
  @IsString() @IsNotEmpty() @MaxLength(100)
  batchNumber!: string;
}

export class ConfirmDeductionDto {
  @IsOptional()
  @IsString()
  operationId?: string;

  @IsOptional()
  @IsString()
  deductionId?: string;

  @IsOptional()
  @IsString()
  treatmentId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsNotEmpty()
  @IsString()
  patientName!: string;

  @IsOptional()
  @IsString()
  doctorId?: string;

  @IsNotEmpty()
  @IsString()
  doctorName!: string;

  @IsOptional()
  @IsString()
  procedureId?: string;

  @IsNotEmpty()
  @IsString()
  procedureName!: string;

  @IsOptional()
  @IsString()
  modeUsed?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DeductedMaterialItemDto)
  materials!: DeductedMaterialItemDto[];

  @IsOptional()
  @IsString()
  confirmedBy!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

