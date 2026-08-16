import type { YearAnalysis } from '../useCases/calculateAbsenceStats';

interface YearCardProps {
  analysis: YearAnalysis;
  onClick: () => void;
}

export function YearCard({ analysis, onClick }: YearCardProps) {
  const isReported = analysis.exceeds42DayThreshold;
  const color = isReported ? 'var(--red)' : 'var(--green)';
  const progress = Math.min(1, analysis.totalDaysAbroad / 42);

  return (
    <button className="year-card card" onClick={onClick}>
      <div
        className="fill"
        style={{
          background: `linear-gradient(to right, color-mix(in srgb, ${color} 15%, transparent) ${progress * 100}%, color-mix(in srgb, ${color} 8%, transparent) ${progress * 100}%)`,
        }}
      />
      <div className="content-row">
        <span className="year-label">{analysis.year}</span>
        <span className="year-value">
          {analysis.totalDaysAbroad}
          <small> / 42</small>
        </span>
      </div>
    </button>
  );
}
