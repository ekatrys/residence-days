import type { Trip } from '../models/trip';
import { tripTypeTitle } from '../models/trip';
import { makeCountry } from '../models/country';
import { daysAbroad } from './calculateAbsenceStats';
import { parseISODate, todayUTC } from '../utils/date';

const HEADER = ['Destination', 'Departure Date', 'Return Date', 'Type', 'Days Abroad', 'Note'];

function escape(field: string): string {
  if (!/[",\n]/.test(field)) return field;
  return `"${field.replace(/"/g, '""')}"`;
}

/** Builds CSV text from trips — same shape the import parser expects back. */
export function makeCSV(trips: Trip[], conservativeCounting: boolean): string {
  const lines = [HEADER.join(',')];

  for (const trip of trips) {
    const country = trip.destination ? makeCountry(trip.destination).name : '';
    const ret = trip.returnDate ? parseISODate(trip.returnDate) : todayUTC();
    const days = daysAbroad(parseISODate(trip.departureDate), ret, conservativeCounting);

    const fields = [
      country,
      trip.departureDate,
      trip.returnDate ?? '',
      tripTypeTitle[trip.tripType],
      String(days),
      trip.note ?? '',
    ];
    lines.push(fields.map(escape).join(','));
  }

  return lines.join('\n');
}

/** Triggers a browser download of the CSV. */
export function downloadCSV(csv: string, filename = `ResidenceDays-Export-${Date.now()}.csv`): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
