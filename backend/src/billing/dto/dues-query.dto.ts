import { IsIn, IsOptional, IsString } from 'class-validator';

export class DuesQueryDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['all', '0-30', '31-60', '60+'])
  aging?: 'all' | '0-30' | '31-60' | '60+' = 'all';
}

