export function verifiedBirthDate(value?: string): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const text = value.trim(), date = new Date(text + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === text && date <= new Date() ? text : null;
}
export function parsePatientCsv(text: string): string[][] {
  const records: string[][] = []; let row: string[] = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c==='"') {
      if (quoted && text[i+1]==='"') { field+='"'; i++; }
      else if (quoted || !field.trim()) quoted=!quoted;
      else throw new Error('Invalid CSV quoting.');
    } else if (!quoted && (c===',' || c==='\n' || c==='\r')) {
      row.push(field.trim()); field='';
      if (c!==',') { if (row.some(Boolean)) records.push(row); row=[]; if(c==='\r' && text[i+1]==='\n') i++; }
    } else field+=c;
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(field.trim()); if(row.some(Boolean)) records.push(row);
  return records;
}
