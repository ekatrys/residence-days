import type { Trip } from '../models/trip';
import {
  addDaysUTC,
  daysBetweenUTC,
  monthOfUTC,
  parseISODate,
  startOfDayUTC,
  startOfYearUTC,
  todayUTC,
  yearOfUTC,
} from '../utils/date';

/**
 * Absence statistics: per-year day totals, threshold flags and overall status.
 *
 * Thresholds (42 days/year, 365 total, 3-year clock) are configuration of the
 * rules being tracked, not a legal interpretation — verify them independently.
 *
 * Overlapping days are deduplicated via interval-merge arithmetic
 * (`mergeIntervalDays`) rather than a date Set, since JS `Date` compares by
 * reference and would never dedupe.
 */

// MARK: - Types

export interface YearAnalysis {
  year: number;
  totalDaysAbroad: number;
  businessTripsPerMonth: Record<number, number>; // month (1-12) -> count of business trips > 1 day
  exceeds42DayThreshold: boolean;
  hasBusinessTripWarning: boolean; // any month has 5+ business trips
  daysCountingAsInterruption: number;
  personalTripCount: number;
  hasExcessivePersonalTrips: boolean; // 10+ personal trips in a year
}

export type ResidenceStatus =
  | { kind: 'safe'; daysUsed: number; daysRemaining: number }
  | { kind: 'warning'; daysUsed: number; daysRemaining: number }
  | { kind: 'exceeded'; lastReturnDate: Date; clockEndsDate: Date; daysRemaining: number };

export interface AbsenceStats {
  yearAnalyses: YearAnalysis[];
  totalInterruption: number;
  status: ResidenceStatus;
  lastReturnDate: Date | null;
}

interface Interval {
  start: Date;
  end: Date;
} // half-open [start, end)

// MARK: - Public: execute

export function execute(
  trips: Trip[],
  conservativeCounting: boolean,
  currentDate: Date = todayUTC(),
): AbsenceStats {
  const yearAnalyses = buildYearAnalyses(trips, conservativeCounting, currentDate).sort(
    (a, b) => b.year - a.year,
  );

  const totalInterruption = yearAnalyses.reduce((sum, y) => sum + y.daysCountingAsInterruption, 0);

  const returnedDates = trips
    .map((t) => t.returnDate)
    .filter((d): d is string => d !== null)
    .map(parseISODate);
  const lastReturnDate = returnedDates.length > 0 ? maxDate(returnedDates) : null;

  const status = determineStatus(totalInterruption, lastReturnDate, currentDate);

  return { yearAnalyses, totalInterruption, status, lastReturnDate };
}

// MARK: - Day Counting (per-trip, for display)

export function daysAbroad(departureDate: Date, returnDate: Date, conservative: boolean): number {
  const startDay = startOfDayUTC(departureDate);
  const endDay = startOfDayUTC(returnDate);
  const between = daysBetweenUTC(startDay, endDay);

  if (between <= 0) return 0;
  return conservative ? between + 1 : Math.max(0, between - 1);
}

/** Days abroad within a specific calendar year for a single trip. */
export function daysAbroadInYear(
  departureDate: Date,
  returnDate: Date,
  year: number,
  conservative: boolean,
): number {
  const interval = abroadIntervalInYear(departureDate, returnDate, year, conservative);
  return interval ? daysBetweenUTC(interval.start, interval.end) : 0;
}

/**
 * Transit dates: departure and return days, always "away" regardless of the
 * conservative setting (the person was in transit, not at home).
 */
export function transitDatesInYear(departureDate: Date, returnDate: Date, year: number): Date[] {
  const dep = startOfDayUTC(departureDate);
  const ret = startOfDayUTC(returnDate);
  if (dep.getTime() === ret.getTime()) return []; // same-day = not abroad

  const yearStart = startOfYearUTC(year);
  const yearEnd = startOfYearUTC(year + 1);

  const dates: Date[] = [];
  if (dep >= yearStart && dep < yearEnd) dates.push(dep);
  if (ret >= yearStart && ret < yearEnd) dates.push(ret);
  return dates;
}

// MARK: - Year Analysis (union of unique days)

function buildYearAnalyses(
  trips: Trip[],
  conservative: boolean,
  currentDate: Date,
): YearAnalysis[] {
  const resolved = trips.map((trip) => ({
    trip,
    departureDate: parseISODate(trip.departureDate),
    returnDate: trip.returnDate ? parseISODate(trip.returnDate) : currentDate,
  }));

  if (resolved.length === 0) return [];

  const allYears = new Set<number>();
  for (const r of resolved) {
    const depYear = yearOfUTC(r.departureDate);
    const retYear = yearOfUTC(r.returnDate);
    for (let y = depYear; y <= retYear; y++) allYears.add(y);
  }

  return Array.from(allYears).map((year) => buildAnalysis(year, resolved, conservative));
}

function buildAnalysis(
  year: number,
  resolvedTrips: { trip: Trip; departureDate: Date; returnDate: Date }[],
  conservative: boolean,
): YearAnalysis {
  const yearStart = startOfYearUTC(year);
  const yearEnd = startOfYearUTC(year + 1);

  const intervals: Interval[] = [];
  const businessPerMonth: Record<number, number> = {};
  let personalCount = 0;

  for (const { trip, departureDate, returnDate } of resolvedTrips) {
    const dep = startOfDayUTC(departureDate);
    const ret = startOfDayUTC(returnDate);
    if (dep >= ret) continue; // same-day = skip

    let abroadStart: Date;
    let abroadEnd: Date;
    if (conservative) {
      abroadStart = dep;
      abroadEnd = addDaysUTC(ret, 1);
    } else {
      abroadStart = addDaysUTC(dep, 1);
      abroadEnd = ret;
    }
    if (abroadStart >= abroadEnd) continue;

    const clippedStart = maxDate([abroadStart, yearStart]);
    const clippedEnd = minDate([abroadEnd, yearEnd]);
    if (clippedStart >= clippedEnd) continue;

    intervals.push({ start: clippedStart, end: clippedEnd });

    if (trip.tripType === 'business') {
      const totalTripDays = daysAbroad(departureDate, returnDate, conservative);
      if (totalTripDays > 1) {
        const month = monthOfUTC(departureDate);
        const depYear = yearOfUTC(departureDate);
        if (depYear === year) {
          businessPerMonth[month] = (businessPerMonth[month] ?? 0) + 1;
        }
      }
    }

    if (trip.tripType === 'personal') {
      const depYear = yearOfUTC(departureDate);
      if (depYear === year) personalCount++;
    }
  }

  const totalDays = mergeIntervalDays(intervals);
  const exceeds42 = totalDays > 42;
  const hasBusinessWarning = Object.values(businessPerMonth).some((count) => count >= 5);

  return {
    year,
    totalDaysAbroad: totalDays,
    businessTripsPerMonth: businessPerMonth,
    exceeds42DayThreshold: exceeds42,
    hasBusinessTripWarning: hasBusinessWarning,
    daysCountingAsInterruption: exceeds42 ? totalDays : 0,
    personalTripCount: personalCount,
    hasExcessivePersonalTrips: personalCount >= 10,
  };
}

/** Merges overlapping/adjacent half-open intervals and sums total days covered. */
function mergeIntervalDays(intervals: Interval[]): number {
  if (intervals.length === 0) return 0;

  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [sorted[0]];

  for (const interval of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (interval.start.getTime() <= last.end.getTime()) {
      last.end = maxDate([last.end, interval.end]);
    } else {
      merged.push(interval);
    }
  }

  return merged.reduce((total, interval) => total + daysBetweenUTC(interval.start, interval.end), 0);
}

/** Clipped half-open [start, end) interval a single trip is "abroad" within a given year. */
function abroadIntervalInYear(
  departureDate: Date,
  returnDate: Date,
  year: number,
  conservative: boolean,
): Interval | null {
  const dep = startOfDayUTC(departureDate);
  const ret = startOfDayUTC(returnDate);
  if (dep >= ret) return null;

  let abroadStart: Date;
  let abroadEnd: Date;
  if (conservative) {
    abroadStart = dep;
    abroadEnd = addDaysUTC(ret, 1);
  } else {
    abroadStart = addDaysUTC(dep, 1);
    abroadEnd = ret;
  }
  if (abroadStart >= abroadEnd) return null;

  const yearStart = startOfYearUTC(year);
  const yearEnd = startOfYearUTC(year + 1);
  const clippedStart = maxDate([abroadStart, yearStart]);
  const clippedEnd = minDate([abroadEnd, yearEnd]);
  if (clippedStart >= clippedEnd) return null;

  return { start: clippedStart, end: clippedEnd };
}

// MARK: - Status

function determineStatus(
  totalInterruption: number,
  lastReturnDate: Date | null,
  currentDate: Date,
): ResidenceStatus {
  if (totalInterruption >= 365) {
    const returnDate = lastReturnDate ?? currentDate;
    const clockEnds = addYearsUTC(returnDate, 3);
    const daysRemaining = Math.max(0, daysBetweenUTC(currentDate, clockEnds));
    return { kind: 'exceeded', lastReturnDate: returnDate, clockEndsDate: clockEnds, daysRemaining };
  } else if (totalInterruption > 300) {
    return { kind: 'warning', daysUsed: totalInterruption, daysRemaining: 365 - totalInterruption };
  } else {
    return { kind: 'safe', daysUsed: totalInterruption, daysRemaining: 365 - totalInterruption };
  }
}

// MARK: - Small date helpers local to this module

function maxDate(dates: Date[]): Date {
  return dates.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b));
}

function minDate(dates: Date[]): Date {
  return dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}

function addYearsUTC(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}
