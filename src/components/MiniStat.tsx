interface MiniStatProps {
  label: string;
  value: string;
}

export function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div className="mini-stat">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}
