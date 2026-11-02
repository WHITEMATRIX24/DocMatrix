import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SaveToothConditionDto {
  @IsInt()
  @Min(11)
  @Max(85)
  toothNumber!: number;

  @IsString()
  @IsNotEmpty({ message: 'Tooth condition is required.' })
  condition!: string; // 'Healthy' | 'Caries' | 'Restored' | 'Missing' | 'Crown' | 'RCT'

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BatchSaveToothConditionsDto {
  @IsOptional()
  conditions?: SaveToothConditionDto[];

  @IsOptional()
  chart?: Record<string, { condition: string; notes?: string }>;
}

