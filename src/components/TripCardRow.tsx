import type { Trip } from '../models/trip';
import { tripTypeIcon } from '../models/trip';
import { makeCountry } from '../models/country';

interface TripCardRowProps {
  trip: Trip;
  daysAbroad: number;
  onEdit: () => void;
}

function dateRangeText(trip: Trip): string {
  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  return trip.returnDate ? `${fmt(trip.departureDate)} → ${fmt(trip.returnDate)}` : `${fmt(trip.departureDate)} → ...`;
}

export function TripCardRow({ trip, daysAbroad, onEdit }: TripCardRowProps) {
  const country = trip.destination ? makeCountry(trip.destination) : null;

  return (
    <div className={`trip-card${trip.tripType === 'business' ? ' business' : ''}`} onClick={onEdit} role="button">
      <span className="flag">{country ? country.flag : tripTypeIcon[trip.tripType]}</span>
      <div className="info">
        {country && <div className="name">{country.name}</div>}
        <div className="dates">{dateRangeText(trip)}</div>
      </div>
      <span className="days">{daysAbroad}d</span>
      {daysAbroad > 28 && <span className="warning-badge">⚠️ 28+</span>}
      {trip.returnDate === null && <span title="still abroad">✈️</span>}
      {trip.tripType === 'business' && <span className="business-badge">💼 Business</span>}
    </div>
  );
}
