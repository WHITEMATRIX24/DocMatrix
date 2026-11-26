import { useEffect, useState } from 'react';

export const APPOINTMENT_TRANSITIONS: Record<string, readonly string[]> = {
  scheduled: ['confirmed', 'checked-in', 'cancelled', 'no-show'],
  confirmed: ['scheduled', 'checked-in', 'cancelled', 'no-show'],
  'checked-in': ['in-progress', 'cancelled'], 'in-progress': ['completed'],
  completed: [], cancelled: [], 'no-show': [],
};
export const canTransitionAppointment = (from: string, to: string) => from === to || !!APPOINTMENT_TRANSITIONS[from]?.includes(to);
export const canRescheduleAppointment = (status: string) => ['scheduled', 'confirmed'].includes(status);

let config = { timezone: 'Asia/Kolkata', workingHours: {} as Record<string, string> };
export function setAppointmentScheduleConfig(value?: { timezone?: string; workingHours?: Record<string, string> }) {
  config = { timezone: value?.timezone || 'Asia/Kolkata', workingHours: value?.workingHours || {} };
}
export function getClinicNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export function useClinicToday() {
  const [, tick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => tick(t => t + 1), 30000); return () => window.clearInterval(timer); }, []);
  return getClinicNow().date;
}
export function clinicHours(date: string): [number, number] | null {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const hours = config.workingHours;
  const text = day === 0 ? hours.sunday || 'Closed' : day === 6 ? hours.saturday || '09:00 AM - 06:00 PM' : hours.weekdays || '09:00 AM - 08:00 PM';
  if (/closed|emergency only/i.test(text)) return null;
  const matches = [...text.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)?/gi)];
  if (matches.length !== 2) return null;
  const minute = (m: RegExpMatchArray) => (m[3] ? Number(m[1]) % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0) : Number(m[1])) * 60 + Number(m[2]);
  return [minute(matches[0]), minute(matches[1])];
}
export function getAppointmentTimeSlots(date = getClinicNow().date, priority = 'normal') {
  const [start, end] = priority === 'emergency' ? [0, 1440] : clinicHours(date) || [540, 1200];
  const slots: string[] = [];
  for (let t = start; t <= Math.min(end, 1439); t += 30) slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  return slots;
}
