import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { getActiveCycle, getRestSeconds, listSessions, nextSession, type SessionRef } from './data/actions';
import { syncInBackground } from './data/sync';
import { ProgramGrid } from './screens/ProgramGrid';
import { SettingsScreen } from './screens/SettingsScreen';
import { Setup } from './screens/Setup';
import { Today } from './screens/Today';

type Tab = 'today' | 'program' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Workout' },
  { id: 'program', label: 'Program' },
  { id: 'settings', label: 'Settings' },
];

export function App() {
  const cycle = useLiveQuery(getActiveCycle);
  const sessions = useLiveQuery(() => (cycle ? listSessions(cycle.id) : []), [cycle?.id]);
  const restSeconds = useLiveQuery(getRestSeconds) ?? 180;
  const [tab, setTab] = useState<Tab>('today');
  const [selected, setSelected] = useState<SessionRef | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW();

  // Sync on launch (also restores data on a fresh device) and whenever connectivity returns.
  useEffect(() => {
    const onOnline = () => void syncInBackground();
    onOnline();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  if (cycle === undefined || sessions === undefined) return <div className="loading">Loading…</div>;

  return (
    <div className="app">
      {offlineReady && (
        <div className="banner" onClick={() => setOfflineReady(false)}>
          Ready to work offline ✕
        </div>
      )}
      <main>
        {!cycle ? (
          <Setup />
        ) : tab === 'today' ? (
          <Today
            cycle={cycle}
            sessions={sessions}
            selected={selected}
            onClearSelection={() => setSelected(null)}
            restSeconds={restSeconds}
          />
        ) : tab === 'program' ? (
          <ProgramGrid
            sessions={sessions}
            current={selected ?? nextSession(sessions)}
            onOpen={(ref) => {
              setSelected(ref);
              setTab('today');
            }}
          />
        ) : (
          <SettingsScreen cycle={cycle} restSeconds={restSeconds} />
        )}
      </main>
      {cycle && (
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
