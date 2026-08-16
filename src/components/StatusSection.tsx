import type { ResidenceStatus } from '../useCases/calculateAbsenceStats';

interface StatusSectionProps {
  status: ResidenceStatus;
  totalInterruption: number;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function StatusSection({ status, totalInterruption }: StatusSectionProps) {
  const fillPct = Math.min(100, (totalInterruption / 365) * 100);
  const barColor = totalInterruption > 300 ? 'var(--red)' : totalInterruption > 200 ? 'var(--orange)' : 'var(--accent)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {status.kind === 'safe' && (
        <div className="status-banner" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
          <span className="icon">✅</span>
          <div>
            <div className="title" style={{ color: 'var(--green)' }}>
              Safe
            </div>
            <div className="subtitle">{status.daysRemaining} interruption days remaining</div>
          </div>
        </div>
      )}

      {status.kind === 'warning' && (
        <div className="status-banner" style={{ background: 'rgba(255, 149, 0, 0.1)' }}>
          <span className="icon">⚠️</span>
          <div>
            <div className="title" style={{ color: 'var(--orange)' }}>
              Warning
            </div>
            <div className="subtitle">Only {status.daysRemaining} interruption days remaining</div>
          </div>
        </div>
      )}

      {status.kind === 'exceeded' && (
        <>
          <div className="status-banner" style={{ background: 'rgba(255, 59, 48, 0.1)' }}>
            <span className="icon">🚫</span>
            <div>
              <div className="title" style={{ color: 'var(--red)' }}>
                3-Year Clock Active
              </div>
              <div className="subtitle">Case referred to review committee</div>
            </div>
          </div>
          <div className="row" style={{ background: 'rgba(255, 59, 48, 0.1)', borderRadius: 12, padding: 12 }}>
            <div>
              <div className="section-label" style={{ fontSize: 11 }}>
                Started
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatDate(status.lastReturnDate)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="section-label" style={{ fontSize: 11 }}>
                Ends
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{formatDate(status.clockEndsDate)}</div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="row" style={{ marginBottom: 6 }}>
          <span className="section-label">Interruption</span>
          <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totalInterruption} / 365</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${fillPct}%`, background: barColor }} />
        </div>
      </div>
    </div>
  );
}
