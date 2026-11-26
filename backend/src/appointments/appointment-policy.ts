export const transitions: Record<string, readonly string[]> = {
  scheduled: ['confirmed', 'checked-in', 'cancelled', 'no-show'],
  confirmed: ['scheduled', 'checked-in', 'cancelled', 'no-show'],
  'checked-in': ['in-progress', 'cancelled'],
  'in-progress': ['completed'], completed: [], cancelled: [], 'no-show': [],
};
export const canTransition = (from: string, to: string) => from === to || !!transitions[from]?.includes(to);
