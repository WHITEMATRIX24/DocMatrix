import { BadRequestException } from '@nestjs/common';
export function localParts(date: Date, timezone: string) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
  } catch { throw new BadRequestException('Invalid clinic timezone or appointment date.'); }
}
export function clinicInstant(date: string, time: string, timezone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BadRequestException('Use YYYY-MM-DD and HH:MM for appointment dates.');
  const wall = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0,10) !== date) throw new BadRequestException('Invalid calendar date.');
  let instant = wall;
  for (let i=0;i<4;i++) {
    const displayed = localParts(new Date(instant), timezone);
    const delta = Date.parse(`${displayed.date}T${displayed.time}:00Z`) - wall;
    if (!delta) break;
    instant -= delta;
  }
  const actual = localParts(new Date(instant), timezone);
  if (actual.date !== date || actual.time !== time) throw new BadRequestException('This local time does not exist in the clinic timezone.');
  for (const offset of [-3600000, 3600000]) {
    const other = localParts(new Date(instant + offset), timezone);
    if (other.date === date && other.time === time) throw new BadRequestException('This local time is ambiguous in the clinic timezone. Choose another time.');
  }
  return new Date(instant);
}
