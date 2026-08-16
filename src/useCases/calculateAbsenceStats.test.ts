import { describe, expect, it } from 'vitest';
import type { Trip, TripType } from '../models/trip';
import { daysAbroad, daysAbroadInYear, execute } from './calculateAbsenceStats';
import { formatISODate } from '../utils/date';

function date(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

let idCounter = 0;
function makeTrip(opts: {
  departure: Date;
  returnDate: Date | null;
  type?: TripType;
}): Trip {
  idCounter++;
  return {
    id: `trip-${idCounter}`,
    destination: '',
    departureDate: formatISODate(opts.departure),
    returnDate: opts.returnDate ? formatISODate(opts.returnDate) : null,
    tripType: opts.type ?? 'personal',
    createdAt: new Date(0).toISOString(),
  };
}

describe('Day Counting', () => {
  it('Same-day trip = 0 in both modes', () => {
    const dep = date(2025, 6, 15);
    expect(daysAbroad(dep, dep, true)).toBe(0);
    expect(daysAbroad(dep, dep, false)).toBe(0);
  });

  it('Conservative: Jan 1 → Jan 5 = 5 days', () => {
    expect(daysAbroad(date(2025, 1, 1), date(2025, 1, 5), true)).toBe(5);
  });

  it('Non-conservative: Jan 1 → Jan 5 = 3 days', () => {
    expect(daysAbroad(date(2025, 1, 1), date(2025, 1, 5), false)).toBe(3);
  });

  it('Conservative: Jan 1 → Jan 2 = 2 days', () => {
    expect(daysAbroad(date(2025, 1, 1), date(2025, 1, 2), true)).toBe(2);
  });

  it('Non-conservative: Jan 1 → Jan 2 = 0 days (nothing strictly between)', () => {
    expect(daysAbroad(date(2025, 1, 1), date(2025, 1, 2), false)).toBe(0);
  });

  it('Non-conservative: Jan 1 → Jan 3 = 1 day', () => {
    expect(daysAbroad(date(2025, 1, 1), date(2025, 1, 3), false)).toBe(1);
  });
});

describe('Cross-Year Day Counting', () => {
  it('Conservative cross-year: Dec 30 → Jan 3, year split sums to total', () => {
    const dep = date(2025, 12, 30);
    const ret = date(2026, 1, 3);

    const total = daysAbroad(dep, ret, true);
    const in2025 = daysAbroadInYear(dep, ret, 2025, true);
    const in2026 = daysAbroadInYear(dep, ret, 2026, true);

    expect(total).toBe(5); // Dec 30, 31, Jan 1, 2, 3
    expect(in2025).toBe(2); // Dec 30, 31
    expect(in2026).toBe(3); // Jan 1, 2, 3
    expect(in2025 + in2026).toBe(total);
  });

  it('Non-conservative cross-year: Dec 30 → Jan 3, year split sums to total', () => {
    const dep = date(2025, 12, 30);
    const ret = date(2026, 1, 3);

    const total = daysAbroad(dep, ret, false);
    const in2025 = daysAbroadInYear(dep, ret, 2025, false);
    const in2026 = daysAbroadInYear(dep, ret, 2026, false);

    expect(total).toBe(3); // Dec 31, Jan 1, 2
    expect(in2025).toBe(1); // Dec 31
    expect(in2026).toBe(2); // Jan 1, 2
    expect(in2025 + in2026).toBe(total);
  });

  it('Trip fully within year returns same as daysAbroad', () => {
    const dep = date(2025, 3, 10);
    const ret = date(2025, 3, 20);

    const total = daysAbroad(dep, ret, true);
    const inYear = daysAbroadInYear(dep, ret, 2025, true);

    expect(total).toBe(inYear);
  });

  it('Trip spanning 3 years distributes correctly', () => {
    const dep = date(2024, 11, 1);
    const ret = date(2026, 2, 1);

    const total = daysAbroad(dep, ret, true);
    const in2024 = daysAbroadInYear(dep, ret, 2024, true);
    const in2025 = daysAbroadInYear(dep, ret, 2025, true);
    const in2026 = daysAbroadInYear(dep, ret, 2026, true);

    expect(in2024 + in2025 + in2026).toBe(total);
    expect(in2025).toBe(365); // full year 2025
  });

  it('No days in unrelated year', () => {
    const dep = date(2025, 6, 1);
    const ret = date(2025, 6, 10);

    expect(daysAbroadInYear(dep, ret, 2024, true)).toBe(0);
  });
});

describe('Year Analysis & Status', () => {
  it('Under 42 days = no interruption', () => {
    const trips = [
      makeTrip({ departure: date(2025, 3, 1), returnDate: date(2025, 3, 10) }),
      makeTrip({ departure: date(2025, 6, 1), returnDate: date(2025, 6, 5) }),
    ];

    const stats = execute(trips, true);
    const year2025 = stats.yearAnalyses.find((y) => y.year === 2025)!;

    expect(year2025.exceeds42DayThreshold).toBe(false);
    expect(year2025.daysCountingAsInterruption).toBe(0);
    expect(stats.totalInterruption).toBe(0);
  });

  it('Over 42 days = all days count as interruption', () => {
    const trips = [
      makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 2, 20) }), // 51 days conservative
    ];

    const stats = execute(trips, true);
    const year2025 = stats.yearAnalyses.find((y) => y.year === 2025)!;

    expect(year2025.exceeds42DayThreshold).toBe(true);
    expect(year2025.daysCountingAsInterruption).toBe(year2025.totalDaysAbroad);
  });

  it('Status: safe when total interruption low', () => {
    const trips = [makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 1, 5) })];
    const stats = execute(trips, true);
    expect(stats.status.kind).toBe('safe');
  });

  it('Status: exceeded when total interruption >= 365', () => {
    const trips: Trip[] = [];
    for (let year = 2018; year <= 2025; year++) {
      trips.push(makeTrip({ departure: date(year, 1, 1), returnDate: date(year, 2, 28) })); // ~59 days conservative each
    }

    const stats = execute(trips, true, date(2026, 1, 1));

    expect(stats.status.kind).toBe('exceeded');
  });

  it('10+ personal trips flagged', () => {
    const trips = Array.from({ length: 11 }, (_, i) => {
      const n = i + 1;
      return makeTrip({ departure: date(2025, 1, n * 2), returnDate: date(2025, 1, n * 2 + 1) });
    });

    const stats = execute(trips, true);
    const year2025 = stats.yearAnalyses.find((y) => y.year === 2025)!;

    expect(year2025.hasExcessivePersonalTrips).toBe(true);
    expect(year2025.personalTripCount).toBe(11);
  });

  it('5+ business trips in a month flagged', () => {
    const trips = Array.from({ length: 5 }, (_, i) => {
      const n = i + 1;
      return makeTrip({
        departure: date(2025, 3, n * 5),
        returnDate: date(2025, 3, n * 5 + 2),
        type: 'business',
      });
    });

    const stats = execute(trips, true);
    const year2025 = stats.yearAnalyses.find((y) => y.year === 2025)!;

    expect(year2025.hasBusinessTripWarning).toBe(true);
  });

  it('Empty trips = empty stats', () => {
    const stats = execute([], true);

    expect(stats.yearAnalyses).toHaveLength(0);
    expect(stats.totalInterruption).toBe(0);
    expect(stats.status).toEqual({ kind: 'safe', daysUsed: 0, daysRemaining: 365 });
  });
});

describe('Day Deduplication', () => {
  it("Overlapping trips don't double-count days", () => {
    const trips = [
      makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 1, 10) }),
      makeTrip({ departure: date(2025, 1, 8), returnDate: date(2025, 1, 15) }),
    ];

    const stats = execute(trips, true);
    expect(stats.yearAnalyses.find((y) => y.year === 2025)!.totalDaysAbroad).toBe(15);
  });

  it('Back-to-back trips sharing transit day count it once', () => {
    const trips = [
      makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 1, 5) }),
      makeTrip({ departure: date(2025, 1, 5), returnDate: date(2025, 1, 10) }),
    ];

    const stats = execute(trips, true);
    expect(stats.yearAnalyses.find((y) => y.year === 2025)!.totalDaysAbroad).toBe(10);
  });

  it('Non-overlapping trips sum correctly', () => {
    const trips = [
      makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 1, 5) }),
      makeTrip({ departure: date(2025, 6, 1), returnDate: date(2025, 6, 5) }),
    ];

    const stats = execute(trips, true);
    expect(stats.yearAnalyses.find((y) => y.year === 2025)!.totalDaysAbroad).toBe(10);
  });
});

describe('Transit Days', () => {
  it('Non-conservative back-to-back trips exclude boundary days', () => {
    const trips = [
      makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 1, 5) }),
      makeTrip({ departure: date(2025, 1, 5), returnDate: date(2025, 1, 10) }),
    ];

    const stats = execute(trips, false);
    // Trip A non-conservative: [Jan 2, Jan 5) = Jan 2,3,4
    // Trip B non-conservative: [Jan 6, Jan 10) = Jan 6,7,8,9
    // Union: 7 days
    expect(stats.yearAnalyses.find((y) => y.year === 2025)!.totalDaysAbroad).toBe(7);
  });

  it('Conservative back-to-back counts all days', () => {
    const trips = [
      makeTrip({ departure: date(2025, 1, 1), returnDate: date(2025, 1, 5) }),
      makeTrip({ departure: date(2025, 1, 5), returnDate: date(2025, 1, 10) }),
    ];

    const stats = execute(trips, true);
    // Jan 1 through Jan 10 = 10 days
    expect(stats.yearAnalyses.find((y) => y.year === 2025)!.totalDaysAbroad).toBe(10);
  });

  it('Same-day trip = 0 even with transit logic', () => {
    const trips = [makeTrip({ departure: date(2025, 3, 15), returnDate: date(2025, 3, 15) })];

    const stats = execute(trips, true);
    const year = stats.yearAnalyses.find((y) => y.year === 2025);
    expect(year?.totalDaysAbroad ?? 0).toBe(0);
  });
});
