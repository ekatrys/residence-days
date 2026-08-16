interface YearPillsProps {
  availableYears: number[];
  selectedYear: number | null;
  onSelect: (year: number | null) => void;
}

export function YearPills({ availableYears, selectedYear, onSelect }: YearPillsProps) {
  return (
    <div className="year-pills">
      <button
        className="year-pill"
        data-selected={selectedYear === null}
        onClick={() => onSelect(null)}
      >
        All
      </button>
      {[...availableYears].reverse().map((year) => (
        <button
          key={year}
          className="year-pill"
          data-selected={selectedYear === year}
          onClick={() => onSelect(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
