import { IsNotEmpty, IsString } from 'class-validator';

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason for cancellation must be specified.' })
  reason!: string;
}

