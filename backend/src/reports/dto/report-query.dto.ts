import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsIn(['today', '7d', 'month', '90d', 'year', 'custom'])
  range?: 'today' | '7d' | 'month' | '90d' | 'year' | 'custom';

  @IsOptional()
  @IsString()
  doctor?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  filter?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
