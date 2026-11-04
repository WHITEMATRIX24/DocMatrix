import { IsOptional, IsString } from 'class-validator';

export class EnquiryQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
