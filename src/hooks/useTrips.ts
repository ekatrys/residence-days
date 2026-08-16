import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NewTrip, Trip } from '../models/trip';
import { tripRepository } from '../repository/tripRepository';
import { daysAbroad } from '../useCases/calculateAbsenceStats';
import { downloadCSV, makeCSV } from '../useCases/exportTrips';
import { parseCSV } from '../useCases/importTrips';
import { parseISODate, todayUTC, yearOfUTC } from '../utils/date';

export interface YearGroup {
  year: number;
  trips: Trip[];
}

function groupByYear(trips: Trip[]): YearGroup[] {
  const grouped = new Map<number, Trip[]>();
  for (const trip of trips) {
    const year = yearOfUTC(parseISODate(trip.departureDate));
    const list = grouped.get(year) ?? [];
    list.push(trip);
    grouped.set(year, list);
  }
  return Array.from(grouped.entries())
    .map(([year, trips]) => ({ year, trips }))
    .sort((a, b) => b.year - a.year);
}

/** Repository-backed trip CRUD plus CSV export/import. */
export function useTrips(conservativeCounting: boolean) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await tripRepository.fetchAll();
    setTrips(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tripsByYear = useMemo(() => groupByYear(trips), [trips]);

  const addTrip = useCallback(
    async (input: NewTrip) => {
      await tripRepository.add(input);
      await refresh();
    },
    [refresh],
  );

  const updateTrip = useCallback(
    async (trip: Trip) => {
      await tripRepository.update(trip);
      await refresh();
    },
    [refresh],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      await tripRepository.delete(id);
      await refresh();
    },
    [refresh],
  );

  const daysAbroadFor = useCallback(
    (trip: Trip) => {
      const ret = trip.returnDate ? parseISODate(trip.returnDate) : todayUTC();
      return daysAbroad(parseISODate(trip.departureDate), ret, conservativeCounting);
    },
    [conservativeCounting],
  );

  const exportCSV = useCallback(() => {
    downloadCSV(makeCSV(trips, conservativeCounting));
  }, [trips, conservativeCounting]);

  /** Returns parse errors (empty = fully clean import). Valid rows are still inserted. */
  const importCSV = useCallback(
    async (text: string): Promise<string[]> => {
      const { trips: parsed, errors } = parseCSV(text);
      if (parsed.length > 0) {
        await tripRepository.addMany(parsed);
        await refresh();
      }
      return errors;
    },
    [refresh],
  );

  return {
    trips,
    tripsByYear,
    loading,
    refresh,
    addTrip,
    updateTrip,
    deleteTrip,
    daysAbroadFor,
    exportCSV,
    importCSV,
  };
}
