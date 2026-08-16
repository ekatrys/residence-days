import type { Trip } from '../models/trip';
import { YearPills } from './YearPills';
import { StatusSection } from './StatusSection';
import { MiniStat } from './MiniStat';
import { YearCard } from './YearCard';
import { TripCardRow } from './TripCardRow';
import { OverlapsWarning } from './OverlapsWarning';
import { CountryBreakdown } from './CountryBreakdown';
import type { useDashboard } from '../hooks/useDashboard';

interface DashboardProps {
  dashboard: ReturnType<typeof useDashboard>;
  trips: Trip[];
  conservativeCounting: boolean;
  onToggleConservative: () => void;
  daysAbroadFor: (trip: Trip) => number;
  onEditTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
}

export function Dashboard({
  dashboard,
  trips,
  conservativeCounting,
  onToggleConservative,
  daysAbroadFor,
  onEditTrip,
  onDeleteTrip,
}: DashboardProps) {
  const {
    stats,
    selectedYear,
    availableYears,
    isAllSelected,
    selectYear,
    allYearAnalysesSorted,
    yearDaysAbroad,
    yearTripCount,
    allTimeDaysAbroad,
    allTimeCountryCount,
    uniqueCountryCount,
    countryStats,
    overlapsForYear,
  } = dashboard;

  const yearTrips = selectedYear !== null ? trips.filter((t) => tripCoversYear(t, selectedYear)) : [];
  const yearOverlaps = selectedYear !== null ? overlapsForYear(selectedYear) : [];

  return (
    <div className="content">
      <div className="card counting-toggle">
        <span>{conservativeCounting ? '🛡️' : '🔓'} Conservative counting</span>
        <button className="switch" data-on={conservativeCounting} onClick={onToggleConservative} />
      </div>

      <YearPills availableYears={availableYears} selectedYear={selectedYear} onSelect={selectYear} />

      {isAllSelected ? (
        <>
          <StatusSection status={stats.status} totalInterruption={stats.totalInterruption} />

          <div className="card mini-stats">
            <MiniStat label="COUNTRIES" value={String(allTimeCountryCount)} />
            <div className="mini-divider" />
            <MiniStat label="DAYS ABROAD" value={String(allTimeDaysAbroad)} />
            <div className="mini-divider" />
            <MiniStat label="INTERRUPTION" value={String(stats.totalInterruption)} />
          </div>

          {allYearAnalysesSorted.map((analysis) => (
            <YearCard key={analysis.year} analysis={analysis} onClick={() => selectYear(analysis.year)} />
          ))}
        </>
      ) : (
        <>
          <div className="card" style={{ padding: 16 }}>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <span style={{ fontSize: 44, fontWeight: 700 }}>{yearDaysAbroad}</span>
              <span style={{ color: 'var(--text-secondary)' }}>/ 42 days</span>
            </div>
            <div className="progress-track" style={{ margin: '10px 0' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (yearDaysAbroad / 42) * 100)}%`,
                  background: yearDaysAbroad > 42 ? 'var(--red)' : 'var(--accent)',
                }}
              />
            </div>
            <div className="card-thin mini-stats">
              <MiniStat label="COUNTRIES" value={String(uniqueCountryCount)} />
              <div className="mini-divider" />
              <MiniStat label="TRIPS" value={String(yearTripCount)} />
            </div>
          </div>

          <OverlapsWarning overlaps={yearOverlaps} />

          {yearTrips.length > 0 && (
            <div>
              <div className="row" style={{ marginBottom: 10 }}>
                <span className="section-label">Trips</span>
                <span className="section-label">{yearTrips.length}</span>
              </div>
              {yearTrips.map((trip) => (
                <TripCardRow
                  key={trip.id}
                  trip={trip}
                  daysAbroad={daysAbroadFor(trip)}
                  onEdit={() => onEditTrip(trip)}
                  onDelete={() => onDeleteTrip(trip.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CountryBreakdown countryStats={countryStats} />

      <p className="disclaimer">Rules may change. Always verify with an immigration lawyer before making decisions.</p>
    </div>
  );
}

function tripCoversYear(trip: Trip, year: number): boolean {
  const currentYear = new Date().getUTCFullYear();
  const depYear = Number(trip.departureDate.slice(0, 4));
  const retYear = trip.returnDate ? Number(trip.returnDate.slice(0, 4)) : currentYear;
  return depYear <= year && retYear >= year;
}
