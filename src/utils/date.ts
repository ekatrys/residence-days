// All date math here works on UTC midnight instants. Using UTC (instead of
// local midnight) sidesteps DST-shift bugs in day-diff math.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parses a 'YYYY-MM-DD' string as a UTC-midnight Date. */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Formats a Date as 'YYYY-MM-DD' using its UTC components. */
export function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today at UTC midnight. */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Whole days from `a` to `b` (b - a), both assumed UTC-midnight instants. */
export function daysBetweenUTC(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export function yearOfUTC(date: Date): number {
  return date.getUTCFullYear();
}

export function monthOfUTC(date: Date): number {
  return date.getUTCMonth() + 1; // 1-12
}

export function startOfYearUTC(year: number): Date {
  return new Date(Date.UTC(year, 0, 1));
}
