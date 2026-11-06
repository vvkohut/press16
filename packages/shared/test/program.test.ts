import { describe, expect, it } from 'vitest';
import { PROGRAM, getSession, parsePrescriptions, sessionTotals } from '../src/program';

describe('program table', () => {
  it('has two sessions for each of 16 weeks', () => {
    expect(PROGRAM).toHaveLength(32);
    for (let week = 1; week <= 16; week++) {
      expect(getSession(week, 'I').week).toBe(week);
      expect(getSession(week, 'II').week).toBe(week);
    }
  });

  it('keeps percentages strictly ascending within each session', () => {
    for (const session of PROGRAM) {
      const pcts = session.prescriptions.map((p) => p.pct);
      expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
      expect(new Set(pcts).size).toBe(pcts.length);
    }
  });

  it.each([
    [1, 'I', 6, 27],
    [5, 'II', 9, 36],
    [9, 'I', 14, 42],
    [11, 'II', 12, 40],
    [15, 'I', 9, 27],
    [16, 'II', 7, 28],
  ] as const)('week %i workout %s totals %i sets / %i reps (matches source table)', (week, workout, sets, reps) => {
    expect(sessionTotals(getSession(week, workout))).toEqual({ sets, reps });
  });

  it('has the heaviest singles only in weeks 13 (95%) and 15 (97.5%)', () => {
    const above90 = PROGRAM.flatMap((s) =>
      s.prescriptions.filter((p) => p.pct > 90).map((p) => `${s.week}${s.workout}:${p.pct}x${p.sets}x${p.reps}`),
    );
    expect(above90).toEqual(['13I:95x1x1', '15I:97.5x1x1']);
  });

  it('week 5 workout II starts at 65% (no 60% set in the source)', () => {
    expect(getSession(5, 'II').prescriptions[0]).toEqual({ pct: 65, sets: 2, reps: 4 });
  });

  it('rejects malformed tokens', () => {
    expect(() => parsePrescriptions('60:5 bad')).toThrow('bad');
  });
});
