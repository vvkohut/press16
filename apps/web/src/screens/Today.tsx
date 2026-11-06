import { planSession, platesPerSide, type Cycle, type SessionLog } from '@press16/shared';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { RestTimer } from '../components/RestTimer';
import { listSets, nextSession, setSessionStatus, toggleSet, updateSetActual, type SessionRef } from '../data/actions';
import { syncInBackground } from '../data/sync';

interface Props {
  cycle: Cycle;
  sessions: SessionLog[];
  selected: SessionRef | null;
  onClearSelection: () => void;
  restSeconds: number;
}

export function Today({ cycle, sessions, selected, onClearSelection, restSeconds }: Props) {
  const ref = selected ?? nextSession(sessions);
  const session = ref && sessions.find((s) => s.week === ref.week && s.workout === ref.workout);
  const sessionId = session?.id;
  const logs = useLiveQuery(() => (sessionId ? listSets(sessionId) : []), [sessionId]) ?? [];
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  if (!ref) {
    return (
      <section className="screen">
        <h1>Cycle complete 🎉</h1>
        <p>Week 17 is the test: warm up and go for your new max (target {cycle.targetMax} kg).</p>
        <p className="muted">Start a new cycle from Settings when you're ready.</p>
      </section>
    );
  }

  const planned = planSession(ref.week, ref.workout, cycle.targetMax, cycle.roundingStep);
  const logByIndex = new Map(logs.map((l) => [l.index, l]));
  const doneCount = planned.filter((p) => logByIndex.get(p.index)?.done).length;
  const status = session?.status ?? 'planned';

  async function finish(next: 'done' | 'skipped') {
    await setSessionStatus(cycle, ref!, next);
    void syncInBackground();
    setRestEndsAt(null);
    setEditing(null);
    onClearSelection();
  }

  return (
    <section className="screen">
      <header className="session-header">
        <div>
          <h1>
            Week {ref.week} · Workout {ref.workout}
          </h1>
          <p className="muted">
            {doneCount}/{planned.length} sets · target {cycle.targetMax} kg
            {status !== 'planned' && <span className={`badge ${status}`}>{status}</span>}
          </p>
        </div>
        {selected && (
          <button className="link" onClick={onClearSelection}>
            Next session →
          </button>
        )}
      </header>

      <ol className="sets">
        {planned.map((p) => {
          const log = logByIndex.get(p.index);
          const weight = log?.actualWeight ?? p.weight;
          const reps = log?.actualReps ?? p.reps;
          const plates = platesPerSide(weight, cycle.barWeight);
          const changed = weight !== p.weight || reps !== p.reps;
          return (
            <li key={p.index} className={log?.done ? 'set done' : 'set'}>
              <button
                className="check"
                aria-label={log?.done ? 'Mark set not done' : 'Mark set done'}
                onClick={async () => {
                  const done = !log?.done;
                  await toggleSet(cycle, ref, p, done);
                  // No rest needed once this was the last remaining set.
                  const setsLeft = planned.some((o) => o.index !== p.index && !logByIndex.get(o.index)?.done);
                  setRestEndsAt(done && setsLeft ? Date.now() + restSeconds * 1000 : null);
                }}
              >
                {log?.done ? '✓' : ''}
              </button>
              <div className="set-main" onClick={() => setEditing(editing === p.index ? null : p.index)}>
                <div className="set-line">
                  <span className="pct">{p.pct}%</span>
                  <span className="kg">{weight} kg</span>
                  <span className="reps">× {reps}</span>
                  {changed && (
                    <span className="planned">
                      plan {p.weight}×{p.reps}
                    </span>
                  )}
                </div>
                <div className="plates">
                  {plates.plates.length ? `${plates.plates.join(' + ')} per side` : 'empty bar'}
                  {plates.remainder > 0 && ` (+${plates.remainder} kg unmatched)`}
                </div>
              </div>
              {editing === p.index && (
                <div className="edit">
                  <label>
                    kg
                    <input
                      key={`w${weight}`}
                      inputMode="decimal"
                      defaultValue={weight}
                      onBlur={(e) => {
                        const v = Number(e.target.value);
                        if (v > 0 && v !== weight) void updateSetActual(cycle, ref, p, { actualWeight: v });
                      }}
                    />
                  </label>
                  <label>
                    reps
                    <input
                      key={`r${reps}`}
                      inputMode="numeric"
                      defaultValue={reps}
                      onBlur={(e) => {
                        const v = Math.round(Number(e.target.value));
                        if (v >= 0 && v !== reps) void updateSetActual(cycle, ref, p, { actualReps: v });
                      }}
                    />
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {restEndsAt && <RestTimer endsAt={restEndsAt} onClose={() => setRestEndsAt(null)} />}

      <div className="actions">
        {status === 'planned' ? (
          <>
            <button className="secondary" onClick={() => finish('skipped')}>
              Skip
            </button>
            <button className="primary" onClick={() => finish('done')}>
              Finish workout
            </button>
          </>
        ) : (
          <button className="secondary" onClick={() => setSessionStatus(cycle, ref, 'planned')}>
            Reopen session
          </button>
        )}
      </div>
    </section>
  );
}
