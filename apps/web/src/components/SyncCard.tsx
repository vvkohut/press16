import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getSyncSettings, getSyncStatus, saveSyncSettings, syncNow, type SyncSettings } from '../data/sync';

export function SyncCard() {
  const settings = useLiveQuery(getSyncSettings);
  const status = useLiveQuery(getSyncStatus);
  if (!settings || !status) return null;
  return <SyncForm key={`${settings.apiUrl}|${settings.syncToken}`} initial={settings} status={status} />;
}

function SyncForm({ initial, status }: { initial: SyncSettings; status: Awaited<ReturnType<typeof getSyncStatus>> }) {
  const [apiUrl, setApiUrl] = useState(initial.apiUrl);
  const [token, setToken] = useState(initial.syncToken);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  async function runSync() {
    setBusy(true);
    setResult('');
    try {
      await saveSyncSettings({ apiUrl, syncToken: token });
      const pushed = await syncNow();
      setResult(`Synced ${pushed} change${pushed === 1 ? '' : 's'}.`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Sync</h2>
      <p className="muted">
        {status.pending} pending · last sync {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'never'}
      </p>
      {status.lastError && <p className="warn">{status.lastError}</p>}
      <div className="form">
        <label>
          Server URL (empty = same host)
          <input value={apiUrl} placeholder="https://press16.example.com" onChange={(e) => setApiUrl(e.target.value)} />
        </label>
        <label>
          Sync token
          <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} />
        </label>
        <button className="primary" disabled={busy || !token} onClick={runSync}>
          {busy ? 'Syncing…' : 'Save & sync now'}
        </button>
        {result && <p className="note">{result}</p>}
      </div>
    </div>
  );
}
