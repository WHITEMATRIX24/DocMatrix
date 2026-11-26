// Minimal Prisma session filters and atomic updates for synthetic persistence tests.
export function matchesSession(row: any, where: any): boolean {
  return Object.entries(where || {}).every(([key, value]: [string, any]) => {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('gt' in value) return row[key] > value.gt;
      if ('not' in value) return row[key] !== value.not;
      if ('has' in value) return row[key]?.includes(value.has);
      return false;
    }
    return row[key] === value;
  });
}
export function updateSession(row: any, data: any) {
  for (const [key, value] of Object.entries(data) as Array<[string, any]>) {
    if (value === undefined) continue;
    row[key] = key === 'previousTokenHashes' && value?.push !== undefined
      ? [...row.previousTokenHashes, value.push] : value;
  }
}
