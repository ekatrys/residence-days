import type { DateOverlap } from '../hooks/useDashboard';
import { makeCountry } from '../models/country';

interface OverlapsWarningProps {
  overlaps: DateOverlap[];
}

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function OverlapsWarning({ overlaps }: OverlapsWarningProps) {
  if (overlaps.length === 0) return null;

  return (
    <div className="warning-box">
      <div className="heading">⚠️ Date overlaps detected</div>
      <p>Simultaneous stay in two countries (&gt; 1 day):</p>
      {overlaps.map((o, i) => {
        const a = makeCountry(o.countryA);
        const b = makeCountry(o.countryB);
        return (
          <div className="item" key={i}>
            {a.flag} {a.name} &amp; {b.flag} {b.name}: {o.overlapDays} days ({shortDate(o.overlapStart)} –{' '}
            {shortDate(o.overlapEnd)})
          </div>
        );
      })}
    </div>
  );
}
