import { getSession, PROGRAM_WEEKS, type SessionLog } from '@press16/shared';
import type { SessionRef } from '../data/actions';

interface Props {
  sessions: SessionLog[];
  current: SessionRef | null;
  onOpen: (ref: SessionRef) => void;
}

const WEEKS = Array.from({ length: PROGRAM_WEEKS }, (_, i) => i + 1);

export function ProgramGrid({ sessions, current, onOpen }: Props) {
  const done = sessions.filter((s) => s.status === 'done').length;

  return (
    <section className="screen">
      <h1>Program</h1>
      <p className="muted">
        {done}/{PROGRAM_WEEKS * 2} sessions done · week 17 = test
      </p>
      <div className="legend">
        <span className="cell done">done</span>
        <span className="cell skipped">skipped</span>
        <span className="cell current">next</span>
      </div>
      <div className="grid">
        {WEEKS.map((week) => (
          <div key={week} className="week-row">
            <span className="week-label">W{week}</span>
            {(['I', 'II'] as const).map((workout) => {
              const status = sessions.find((s) => s.week === week && s.workout === workout)?.status ?? 'planned';
              const top = getSession(week, workout).prescriptions.at(-1);
              const isCurrent = current?.week === week && current.workout === workout;
              return (
                <button
                  key={workout}
                  className={`cell ${status}${isCurrent ? ' current' : ''}`}
                  onClick={() => onOpen({ week, workout })}
                >
                  <strong>{workout}</strong>
                  {top && (
                    <span>
                      top {top.pct}% {top.sets > 1 ? `${top.sets}×` : ''}
                      {top.reps}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
