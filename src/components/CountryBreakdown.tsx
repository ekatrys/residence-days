import type { CountryStats } from '../hooks/useDashboard';
import { makeCountry } from '../models/country';

interface CountryBreakdownProps {
  countryStats: CountryStats[];
}

export function CountryBreakdown({ countryStats }: CountryBreakdownProps) {
  if (countryStats.length === 0) return null;

  return (
    <div>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Country breakdown
      </div>
      {countryStats.map((stat) => {
        const country = makeCountry(stat.countryCode);
        return (
          <div className="country-row" key={stat.countryCode}>
            <span className="flag">{country.flag}</span>
            <span className="name">{country.name}</span>
            <div className="days-value">
              <div className="num">{stat.totalDays}</div>
              <div className="unit">days</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
