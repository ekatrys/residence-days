import { useState } from 'react';
import type { NewTrip, Trip, TripType } from '../models/trip';
import { TRIP_TYPES, tripTypeIcon, tripTypeTitle } from '../models/trip';
import { makeCountry } from '../models/country';
import { daysAbroad } from '../useCases/calculateAbsenceStats';
import { parseISODate } from '../utils/date';
import { CountryPicker } from './CountryPicker';

interface TripFormSheetProps {
  editing: Trip | null;
  conservativeCounting: boolean;
  onSave: (input: NewTrip) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function TripFormSheet({ editing, conservativeCounting, onSave, onDelete, onClose }: TripFormSheetProps) {
  const [tripType, setTripType] = useState<TripType>(editing?.tripType ?? 'personal');
  const [destination, setDestination] = useState(editing?.destination ?? '');
  const [departureDate, setDepartureDate] = useState(editing?.departureDate ?? '');
  const [returnDate, setReturnDate] = useState(editing?.returnDate ?? '');
  const [stillAbroad, setStillAbroad] = useState(editing ? editing.returnDate === null : false);
  const [note, setNote] = useState(editing?.note ?? '');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const isEditing = editing !== null;
  const country = destination ? makeCountry(destination) : null;

  const effectiveReturn = stillAbroad ? '' : returnDate;
  const previewDays =
    departureDate && !stillAbroad && effectiveReturn
      ? daysAbroad(parseISODate(departureDate), parseISODate(effectiveReturn), conservativeCounting)
      : 0;

  const canSave = departureDate !== '' && (stillAbroad || returnDate === '' || returnDate >= departureDate);

  function handleSave() {
    if (!departureDate) return;
    onSave({
      destination,
      departureDate,
      returnDate: stillAbroad ? null : returnDate || departureDate,
      tripType,
      note: note.trim() || undefined,
    });
    onClose();
  }

  function handleDelete() {
    onDelete?.();
    onClose();
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button onClick={onClose}>Cancel</button>
          <h2>{isEditing ? 'Edit Trip' : 'Add Trip'}</h2>
          <span style={{ width: 40 }} />
        </div>

        <div className="days-preview">
          <div className={`num${previewDays > 28 ? ' over' : ''}`}>{previewDays}</div>
          <div className="unit">days</div>
          {previewDays > 28 && (
            <div style={{ color: 'var(--orange)', fontSize: 12, marginTop: 4 }}>⚠️ Exceeds 28 days</div>
          )}
        </div>

        <div className="form-field">
          <label>Purpose</label>
          <div className="type-selector">
            {TRIP_TYPES.map((type) => (
              <button
                key={type}
                className="type-option"
                data-selected={tripType === type}
                onClick={() => setTripType(type)}
              >
                {tripTypeIcon[type]} {tripTypeTitle[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-field">
          <label>Departure date</label>
          <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Return date</label>
          <input
            type="date"
            value={returnDate}
            min={departureDate || undefined}
            disabled={stillAbroad}
            onChange={(e) => setReturnDate(e.target.value)}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={stillAbroad}
              onChange={(e) => setStillAbroad(e.target.checked)}
            />
            Still abroad (no return date yet)
          </label>
          {!stillAbroad && returnDate && returnDate < departureDate && (
            <div className="import-errors">Return date can't be before departure date.</div>
          )}
        </div>

        <div className="form-field">
          <label>Country</label>
          <button className="country-select-btn" onClick={() => setShowCountryPicker(true)}>
            {country ? (
              <>
                <span style={{ fontSize: 18 }}>{country.flag}</span>
                <span>{country.name}</span>
              </>
            ) : (
              <>
                <span>🌐</span>
                <span style={{ color: 'var(--text-secondary)' }}>Select country</span>
              </>
            )}
          </button>
        </div>

        <div className="form-field">
          <label>Note (optional)</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. conference, family visit" />
        </div>

        {isEditing && onDelete && (
          <button className="danger-btn" onClick={handleDelete}>
            Delete Trip
          </button>
        )}

        <div style={{ height: 8 }} />
        <button className="primary-btn" disabled={!canSave} onClick={handleSave}>
          Save
        </button>
      </div>

      {showCountryPicker && (
        <CountryPicker
          selected={destination}
          onSelect={setDestination}
          onClose={() => setShowCountryPicker(false)}
        />
      )}
    </div>
  );
}
