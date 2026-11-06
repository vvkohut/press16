import type { Cycle } from '@press16/shared';
import { useState, type ChangeEvent } from 'react';
import { SyncCard } from '../components/SyncCard';
import { exportData, importData, setRestSeconds, updateCycle } from '../data/actions';

interface Props {
  cycle: Cycle;
  restSeconds: number;
}

export function SettingsScreen({ cycle, restSeconds }: Props) {
  const [target, setTarget] = useState(String(cycle.targetMax));
  const [rest, setRest] = useState(String(restSeconds));
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [message, setMessage] = useState('');

  async function saveTarget() {
    const value = Number(target);
    if (!(value > 0)) return setMessage('Target must be a positive number.');
    await updateCycle(cycle, { targetMax: value });
    setMessage(`Target set to ${value} kg — upcoming sets use the new weights; logged sets keep theirs.`);
  }

  async function saveRest() {
    const value = Math.round(Number(rest));
    if (!(value > 0)) return setMessage('Rest must be a positive number of seconds.');
    await setRestSeconds(value);
    setMessage(`Rest timer set to ${value}s.`);
  }

  async function download() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `press16-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const count = await importData(JSON.parse(await file.text()));
      setMessage(`Imported ${count} records.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  return (
    <section className="screen">
      <h1>Settings</h1>
      {message && <p className="note">{message}</p>}

      <div className="card">
        <h2>Current cycle</h2>
        <p className="muted">
          Started {cycle.startDate} · max at start {cycle.currentMax} kg · round {cycle.roundingStep} kg · bar{' '}
          {cycle.barWeight} kg
        </p>
        <label className="inline">
          Target (100%) kg
          <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
          <button className="secondary" onClick={saveTarget}>
            Save
          </button>
        </label>
      </div>

      <div className="card">
        <h2>Rest timer</h2>
        <label className="inline">
          Seconds
          <input inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} />
          <button className="secondary" onClick={saveRest}>
            Save
          </button>
        </label>
      </div>

      <SyncCard />

      <div className="card">
        <h2>Backup</h2>
        <div className="row">
          <button className="secondary" onClick={download}>
            Export JSON
          </button>
          <label className="button secondary">
            Import JSON
            <input type="file" accept="application/json" hidden onChange={upload} />
          </label>
        </div>
      </div>

      <div className="card">
        <h2>New cycle</h2>
        <p className="muted">Ends the current cycle (its logs are kept) and opens setup.</p>
        {confirmAbandon ? (
          <div className="row">
            <button className="secondary" onClick={() => setConfirmAbandon(false)}>
              Cancel
            </button>
            <button className="danger" onClick={() => updateCycle(cycle, { status: 'abandoned' })}>
              Yes, end cycle
            </button>
          </div>
        ) : (
          <button className="secondary" onClick={() => setConfirmAbandon(true)}>
            Start a new cycle…
          </button>
        )}
      </div>

      <p className="muted small">Program: V.L. Muravyov, "Powerlifting. Path to Strength" — 16-week raw bench press.</p>
    </section>
  );
}
