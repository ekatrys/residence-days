import type { NewTrip, TripType } from '../models/trip';
import { allCountries } from '../models/country';

export interface ImportResult {
  trips: NewTrip[];
  errors: string[]; // one entry per row that failed to parse, 1-indexed (header = row 0)
}

const TITLE_TO_TYPE: Record<string, TripType> = { Personal: 'personal', Business: 'business' };
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses one CSV line, respecting quoted fields (mirrors the escape() in exportTrips). */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function resolveCountryCode(destinationName: string): string {
  if (!destinationName) return '';
  if (/^[A-Za-z]{2}$/.test(destinationName)) return destinationName.toUpperCase();
  const match = allCountries().find(
    (c) => c.name.toLowerCase() === destinationName.toLowerCase(),
  );
  return match?.code ?? '';
}

/** Parses CSV text produced by `makeCSV` back into importable trips. Recomputes nothing — Days Abroad column is ignored. */
export function parseCSV(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const trips: NewTrip[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    // row 0 is the header
    const [destination, departureDate, returnDate, type, , note] = parseLine(lines[i]);

    if (!ISO_DATE_RE.test(departureDate ?? '')) {
      errors.push(`Row ${i}: invalid departure date "${departureDate}"`);
      continue;
    }
    if (returnDate && !ISO_DATE_RE.test(returnDate)) {
      errors.push(`Row ${i}: invalid return date "${returnDate}"`);
      continue;
    }
    if (returnDate && returnDate < departureDate) {
      errors.push(`Row ${i}: return date before departure date`);
      continue;
    }

    trips.push({
      destination: resolveCountryCode(destination ?? ''),
      departureDate,
      returnDate: returnDate || null,
      tripType: TITLE_TO_TYPE[type] ?? 'personal',
      note: note || undefined,
    });
  }

  return { trips, errors };
}
