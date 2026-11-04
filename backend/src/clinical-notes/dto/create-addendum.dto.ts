import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAddendumDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}
