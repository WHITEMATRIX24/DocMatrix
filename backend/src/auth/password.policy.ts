import { BadRequestException } from '@nestjs/common';
import { registerDecorator } from 'class-validator';

export function validNewPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && Buffer.byteLength(value, 'utf8') <= 72 && !value.includes('\0');
}
export function assertNewPassword(value: unknown): asserts value is string {
  if (!validNewPassword(value)) throw new BadRequestException('Use at least 12 characters and at most 72 UTF-8 bytes for your password.');
}
export function StrongPassword(): PropertyDecorator {
  return (target, propertyName) => registerDecorator({ name: 'strongPassword', target: target.constructor,
    propertyName: String(propertyName), validator: { validate: validNewPassword,
      defaultMessage: () => 'Use at least 12 characters and at most 72 UTF-8 bytes for your password.' } });
}
