/**
 * V.L. Muravyov, "Powerlifting. Path to Strength" — 16-week raw bench press cycle.
 * Two sessions per week (I = heavier, II = lighter); week 17 is the competition / max test.
 * Percentages are of the TARGET result (the expected max at the end of the cycle).
 *
 * Notation per session: "<pct>:<reps>" = 1 set, "<pct>:<sets>x<reps>" = several sets.
 */

export type WorkoutId = 'I' | 'II';

export interface Prescription {
  pct: number;
  sets: number;
  reps: number;
}

export interface ProgramSession {
  week: number;
  workout: WorkoutId;
  prescriptions: Prescription[];
}

export const PROGRAM_WEEKS = 16;
export const TEST_WEEK = 17;

const RAW: Record<number, Record<WorkoutId, string>> = {
  1: { I: '60:5 65:5 70:5 75:3x4', II: '60:5 65:5 70:2x5' },
  2: { I: '60:5 65:5 70:5 75:2x4 80:2x3', II: '60:5 65:5 70:5 75:2x4' },
  3: { I: '60:5 65:5 70:5 75:4 80:3 85:3x2', II: '60:5 65:5 70:3x5' },
  4: { I: '60:5 65:5 70:3x3 75:3 80:3x3', II: '60:5 65:2x5 70:4 75:3x4' },
  5: { I: '60:5 65:5 70:4 75:4 80:2x3 85:3x2', II: '65:2x4 70:4x4 75:3x4' },
  6: { I: '60:5 65:5 70:4 75:4 80:3x3', II: '60:5 65:5 70:3x5' },
  7: { I: '60:5 65:5 70:4 75:4 80:3 85:3x2', II: '60:5 65:5 70:4 75:3x4' },
  8: { I: '60:5 65:5 70:4 75:4 80:3x3', II: '60:5 65:5 70:3x5' },
  9: { I: '60:5 65:2x5 70:2x4 75:2x3 80:2x3 85:2x2 90:3x1', II: '60:5 65:5 70:5 75:4 80:3 85:2x2' },
  10: { I: '60:5 65:5 70:4 75:4 80:2x3 85:3x2', II: '60:5 65:5 70:5 75:4 80:3x3' },
  11: { I: '60:5 65:5 70:2x4 75:4 80:3 85:2x2 90:3x1', II: '60:5 65:5 70:2x5 75:2x4 80:2x3 85:2x2 90:2x1' },
  12: { I: '60:5 65:5 70:5 75:4 80:3 85:2 90:3x1', II: '60:5 65:5 70:5 75:4 80:3 85:3x2' },
  13: { I: '60:5 65:5 70:5 75:4 80:3 85:2 90:2x1 95:1', II: '60:5 65:5 70:5 75:4 80:3 85:2 90:3x1' },
  14: { I: '60:5 65:5 70:5 75:4 80:3 85:2x2 90:3x1', II: '60:5 65:5 70:5 75:4 80:3x3' },
  15: { I: '60:5 65:5 70:5 75:4 80:3 85:2 90:2x1 97.5:1', II: '60:5 65:5 70:5 75:4 80:3 85:2x2' },
  16: { I: '60:5 65:5 70:5 75:4 80:3 85:3x2', II: '60:5 65:5 70:5 75:4 80:3x3' },
};

export function parsePrescriptions(spec: string): Prescription[] {
  return spec.trim().split(/\s+/).map((token) => {
    const match = /^(\d+(?:\.\d+)?):(?:(\d+)x)?(\d+)$/.exec(token);
    if (!match) throw new Error(`Invalid prescription token: ${token}`);
    return { pct: Number(match[1]), sets: Number(match[2] ?? 1), reps: Number(match[3]) };
  });
}

export const PROGRAM: ProgramSession[] = Object.entries(RAW).flatMap(([week, sessions]) =>
  (['I', 'II'] as const).map((workout) => ({
    week: Number(week),
    workout,
    prescriptions: parsePrescriptions(sessions[workout]),
  })),
);

export function getSession(week: number, workout: WorkoutId): ProgramSession {
  const session = PROGRAM.find((s) => s.week === week && s.workout === workout);
  if (!session) throw new Error(`No session for week ${week} workout ${workout}`);
  return session;
}

export function sessionTotals(session: ProgramSession): { sets: number; reps: number } {
  return session.prescriptions.reduce(
    (acc, p) => ({ sets: acc.sets + p.sets, reps: acc.reps + p.sets * p.reps }),
    { sets: 0, reps: 0 },
  );
}
