import { IsBoolean } from 'class-validator';
export class LegalHoldDto { @IsBoolean() legalHold!: boolean; }
