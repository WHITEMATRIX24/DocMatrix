import 'reflect-metadata';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
export const VALID_TEETH = [1,2,3,4].flatMap(q => Array.from({length: 8}, (_,i) => q*10+i+1)).concat([5,6,7,8].flatMap(q => Array.from({length:5}, (_,i) => q*10+i+1)));
export const TOOTH_CONDITIONS = ['Healthy','Caries','Restored','Missing','Crown','RCT'];
export class SaveToothConditionDto {
  @IsInt() @IsIn(VALID_TEETH)
  toothNumber!: number;
  @IsIn(TOOTH_CONDITIONS)
  condition!: string;
  @IsString() @IsOptional() @MaxLength(10000)
  notes?: string;
}
export class BatchSaveToothConditionsDto {
  @IsOptional() @IsArray() @ArrayNotEmpty() @ArrayMaxSize(52) @ValidateNested({each:true}) @Type(() => SaveToothConditionDto)
  conditions?: SaveToothConditionDto[];
  @IsOptional() @IsObject()
  chart?: Record<string, {condition: string; notes?: string}>;
}
