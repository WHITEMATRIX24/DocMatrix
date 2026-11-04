import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeductedMaterialItemDto {
  itemId!: string;
  name!: string;
  unit!: string;
  suggestedQty?: number;
  confirmedQty!: number;
  wastageQty?: number;
  batchNumber!: string;
}

export class ConfirmDeductionDto {
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
  materials!: DeductedMaterialItemDto[];

  @IsNotEmpty()
  @IsString()
  confirmedBy!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

