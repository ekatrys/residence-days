import { useMemo, useState } from 'react';
import { allCountries, matchesSearch, type Country } from '../models/country';

interface CountryPickerProps {
  selected: string; // country code, '' = none
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CountryPicker({ selected, onSelect, onClose }: CountryPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const all = allCountries();
    if (!query.trim()) return all;
    return all.filter((c) => matchesSearch(c, query));
  }, [query]);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button onClick={onClose}>Cancel</button>
          <h2>Select Country</h2>
          {selected ? (
            <button
              onClick={() => {
                onSelect('');
                onClose();
              }}
            >
              Clear
            </button>
          ) : (
            <span style={{ width: 40 }} />
          )}
        </div>
        <div className="form-field">
          <input
            type="text"
            placeholder="Search country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="country-list">
          {filtered.map((country: Country) => (
            <button
              key={country.code}
              className="country-list-item"
              onClick={() => {
                onSelect(country.code);
                onClose();
              }}
            >
              <span style={{ fontSize: 20 }}>{country.flag}</span>
              <span style={{ flex: 1 }}>{country.name}</span>
              {selected === country.code && <span style={{ color: 'var(--accent)' }}>✓</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
