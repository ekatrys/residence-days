import { useEffect, useMemo, useState } from 'react';
import type { Trip } from '../models/trip';
import { daysAbroad, daysAbroadInYear, execute } from '../useCases/calculateAbsenceStats';
import { daysBetweenUTC, parseISODate, startOfYearUTC, todayUTC, yearOfUTC } from '../utils/date';

export interface CountryStats {
  countryCode: string;
  tripCount: number;
  totalDays: number;
}

export interface DateOverlap {
  countryA: string;
  countryB: string;
  overlapStart: Date;
  overlapEnd: Date;
  overlapDays: number;
  year: number;
}

function tripCoversYear(trip: Trip, year: number, currentYear: number): boolean {
  const depYear = yearOfUTC(parseISODate(trip.departureDate));
  const retYear = trip.returnDate ? yearOfUTC(parseISODate(trip.returnDate)) : currentYear;
  return depYear <= year && retYear >= year;
}

/** Derives all dashboard figures from the trip list, memoized per input change. */
export function useDashboard(trips: Trip[], conservativeCounting: boolean) {
  const currentYear = yearOfUTC(todayUTC());
  const [selectedYear, setSelectedYearRaw] = useState<number | null>(currentYear);

  const stats = useMemo(() => execute(trips, conservativeCounting), [trips, conservativeCounting]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const t of trips) {
      years.add(yearOfUTC(parseISODate(t.departureDate)));
      if (t.returnDate) years.add(yearOfUTC(parseISODate(t.returnDate)));
    }
    return Array.from(years).sort((a, b) => a - b);
  }, [trips, currentYear]);

  // If the selected year disappears (e.g. its only trip was deleted), fall back to the current year.
  useEffect(() => {
    if (selectedYear !== null && !availableYears.includes(selectedYear)) {
      setSelectedYearRaw(currentYear);
    }
  }, [selectedYear, availableYears, currentYear]);

  const isAllSelected = selectedYear === null;

  const selectedYearAnalysis = useMemo(
    () => (selectedYear === null ? null : stats.yearAnalyses.find((y) => y.year === selectedYear) ?? null),
    [stats, selectedYear],
  );

  const allYearAnalysesSorted = useMemo(
    () => [...stats.yearAnalyses].sort((a, b) => b.year - a.year),
    [stats],
  );

  const dangerYears = useMemo(
    () => stats.yearAnalyses.filter((y) => y.exceeds42DayThreshold),
    [stats],
  );

  const yearStats = useMemo(() => {
    if (selectedYear === null) {
      return { yearDaysAbroad: 0, yearDaysElapsed: 0, yearPercentage: 0, yearTripCount: trips.length };
    }

    const yearDaysAbroad = selectedYearAnalysis?.totalDaysAbroad ?? 0;

    let yearDaysElapsed: number;
    if (selectedYear === currentYear) {
      yearDaysElapsed = daysBetweenUTC(startOfYearUTC(selectedYear), todayUTC()) + 1;
    } else if (selectedYear < currentYear) {
      yearDaysElapsed = daysBetweenUTC(startOfYearUTC(selectedYear), startOfYearUTC(selectedYear + 1));
    } else {
      yearDaysElapsed = 0;
    }

    const yearPercentage = yearDaysElapsed > 0 ? Math.floor((yearDaysAbroad * 100) / yearDaysElapsed) : 0;

    const yearTripCount = trips.filter((t) => tripCoversYear(t, selectedYear, currentYear)).length;

    return { yearDaysAbroad, yearDaysElapsed, yearPercentage, yearTripCount };
  }, [selectedYear, selectedYearAnalysis, trips, currentYear]);

  const allTimeStats = useMemo(() => {
    const countries = new Set<string>();
    let totalDays = 0;
    for (const t of trips) {
      if (t.destination) countries.add(t.destination);
      const ret = t.returnDate ? parseISODate(t.returnDate) : todayUTC();
      totalDays += daysAbroad(parseISODate(t.departureDate), ret, conservativeCounting);
    }
    return { allTimeCountryCount: countries.size, allTimeDaysAbroad: totalDays };
  }, [trips, conservativeCounting]);

  const { countryStats, uniqueCountryCount } = useMemo(() => {
    const perCountry = new Map<string, { count: number; days: number }>();

    const accumulate = (code: string, days: number) => {
      const entry = perCountry.get(code) ?? { count: 0, days: 0 };
      entry.count += 1;
      entry.days += days;
      perCountry.set(code, entry);
    };

    if (selectedYear !== null) {
      const yearTrips = trips.filter((t) => tripCoversYear(t, selectedYear, currentYear));
      for (const t of yearTrips) {
        if (!t.destination) continue;
        const ret = t.returnDate ? parseISODate(t.returnDate) : todayUTC();
        const days = daysAbroadInYear(parseISODate(t.departureDate), ret, selectedYear, conservativeCounting);
        if (days > 0) accumulate(t.destination, days);
      }
    } else {
      for (const t of trips) {
        if (!t.destination) continue;
        const ret = t.returnDate ? parseISODate(t.returnDate) : todayUTC();
        const days = daysAbroad(parseISODate(t.departureDate), ret, conservativeCounting);
        if (days > 0) accumulate(t.destination, days);
      }
    }

    const countryStats: CountryStats[] = Array.from(perCountry.entries())
      .map(([countryCode, { count, days }]) => ({ countryCode, tripCount: count, totalDays: days }))
      .sort((a, b) => b.totalDays - a.totalDays);

    return { countryStats, uniqueCountryCount: perCountry.size };
  }, [trips, selectedYear, currentYear, conservativeCounting]);

  const overlaps = useMemo(() => {
    const found: DateOverlap[] = [];
    const withDestination = trips.filter((t) => t.destination);

    for (let i = 0; i < withDestination.length; i++) {
      for (let j = i + 1; j < withDestination.length; j++) {
        const a = withDestination[i];
        const b = withDestination[j];
        if (a.destination === b.destination) continue;

        const aStart = parseISODate(a.departureDate);
        const bStart = parseISODate(b.departureDate);
        const aEnd = a.returnDate ? parseISODate(a.returnDate) : todayUTC();
        const bEnd = b.returnDate ? parseISODate(b.returnDate) : todayUTC();

        const overlapStart = aStart > bStart ? aStart : bStart;
        const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
        const days = daysBetweenUTC(overlapStart, overlapEnd);

        // Only flag if overlap > 1 day (1 day = transit, normal)
        if (days > 1) {
          found.push({
            countryA: a.destination,
            countryB: b.destination,
            overlapStart,
            overlapEnd,
            overlapDays: days,
            year: yearOfUTC(overlapStart),
          });
        }
      }
    }
    return found;
  }, [trips]);

  const overlapsForYear = (year: number) => overlaps.filter((o) => o.year === year);

  const selectYear = (year: number | null) => setSelectedYearRaw(year);

  return {
    stats,
    selectedYear,
    availableYears,
    isAllSelected,
    selectYear,
    selectedYearAnalysis,
    allYearAnalysesSorted,
    dangerYears,
    ...yearStats,
    ...allTimeStats,
    countryStats,
    uniqueCountryCount,
    overlaps,
    overlapsForYear,
  };
}
