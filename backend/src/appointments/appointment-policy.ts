export const transitions: Record<string, readonly string[]> = {
  scheduled: ['confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'],
  confirmed: ['scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'],
  'checked-in': ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
  'in-progress': ['scheduled', 'confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'],
  completed: ['scheduled', 'confirmed', 'checked-in', 'in-progress', 'cancelled', 'no-show'],
  cancelled: ['scheduled', 'confirmed', 'checked-in'],
  'no-show': ['scheduled', 'confirmed', 'checked-in'],
};
export const canTransition = (from: string, to: string) => from === to || !!transitions[from]?.includes(to);
