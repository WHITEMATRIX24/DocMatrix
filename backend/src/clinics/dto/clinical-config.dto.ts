import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
class CatalogueEntryDto {
  @IsString() @MaxLength(120) id!: string;
  @IsOptional() @IsString() @MaxLength(300) name?: string;
  @IsOptional() @IsString() @MaxLength(200) category?: string;
  @IsOptional() @IsString() @MaxLength(100) strength?: string;
  @IsOptional() @IsString() @MaxLength(100) form?: string;
  @IsOptional() @IsString() @MaxLength(100) code?: string;
  @IsOptional() @IsString() @MaxLength(10000) content?: string;
  @IsOptional() @IsString() @MaxLength(10000) description?: string;
  @IsOptional() @Min(0) price?: number;
  @IsOptional() @IsBoolean() isCustom?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1440) estMinutes?: number;
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() @MaxLength(100) route?: string;
  @IsOptional() @IsString() @MaxLength(200) frequency?: string;
  @IsOptional() @IsString() @MaxLength(200) duration?: string;
  @IsOptional() @IsString() @MaxLength(2000) instructions?: string;
  @IsOptional() @IsString() @MaxLength(100) icd?: string;
  @IsOptional() @IsString() @MaxLength(200) commonSite?: string;
  @IsOptional() @IsString() @MaxLength(100) severity?: string;
  @IsOptional() @IsString() @MaxLength(10000) complaint?: string;
  @IsOptional() @IsString() @MaxLength(10000) findings?: string;
  @IsOptional() @IsString() @MaxLength(10000) plan?: string;
  @IsOptional() @IsString() @MaxLength(100) fee?: string;

}
class GovernanceDto {
  @IsOptional() @IsBoolean() mandatoryConsentForSurgery?: boolean;
  @IsOptional() @IsBoolean() mandatoryDiagnosisBeforeRx?: boolean;
  @IsOptional() @IsBoolean() twoFactorForPrescriptions?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(120) autoRecallIntervalMonths?: number;
}
export class ClinicalConfigDto {
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => CatalogueEntryDto) customMedicines?: CatalogueEntryDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => CatalogueEntryDto) customProcedures?: CatalogueEntryDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => CatalogueEntryDto) customDiagnoses?: CatalogueEntryDto[];
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @ValidateNested({ each: true }) @Type(() => CatalogueEntryDto) customTemplates?: CatalogueEntryDto[];
  @IsOptional() @ValidateNested() @Type(() => GovernanceDto) governancePolicies?: GovernanceDto;
}
