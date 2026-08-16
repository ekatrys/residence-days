import { useRef, useState, type ChangeEvent } from 'react';
import type { Trip } from './models/trip';
import { useSettings } from './hooks/useSettings';
import { useTrips } from './hooks/useTrips';
import { useDashboard } from './hooks/useDashboard';
import { Dashboard } from './components/Dashboard';
import { TripFormSheet } from './components/TripFormSheet';

export default function App() {
  const { conservativeCounting, setConservativeCounting } = useSettings();
  const { trips, addTrip, updateTrip, deleteTrip, daysAbroadFor, exportCSV, importCSV } =
    useTrips(conservativeCounting);
  const dashboard = useDashboard(trips, conservativeCounting);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const text = await file.text();
    const errors = await importCSV(text);
    setImportErrors(errors);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ResidenceDays</h1>
        <div className="header-actions">
          <button className="icon-button" onClick={() => fileInputRef.current?.click()} title="Import CSV">
            📥
          </button>
          <button className="icon-button" onClick={exportCSV} disabled={trips.length === 0} title="Export CSV">
            📤
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      {importErrors.length > 0 && (
        <div className="import-errors" style={{ padding: '0 16px' }}>
          {importErrors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
          <button onClick={() => setImportErrors([])}>Dismiss</button>
        </div>
      )}

      <Dashboard
        dashboard={dashboard}
        trips={trips}
        conservativeCounting={conservativeCounting}
        onToggleConservative={() => setConservativeCounting((v) => !v)}
        daysAbroadFor={daysAbroadFor}
        onEditTrip={setTripToEdit}
        onDeleteTrip={deleteTrip}
      />

      <button className="fab" onClick={() => setShowAddSheet(true)} aria-label="Add trip">
        +
      </button>

      {showAddSheet && (
        <TripFormSheet
          editing={null}
          conservativeCounting={conservativeCounting}
          onSave={addTrip}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {tripToEdit && (
        <TripFormSheet
          editing={tripToEdit}
          conservativeCounting={conservativeCounting}
          onSave={(input) => updateTrip({ ...tripToEdit, ...input })}
          onDelete={() => deleteTrip(tripToEdit.id)}
          onClose={() => setTripToEdit(null)}
        />
      )}
    </div>
  );
}
