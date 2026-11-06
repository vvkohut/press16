import { getSession, type WorkoutId } from './program';

export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

const round2 = (x: number) => Math.round(x * 100) / 100;

export function roundTo(weight: number, step: number): number {
  if (step <= 0) throw new Error('step must be positive');
  return round2(Math.round(weight / step) * step);
}

export function prescribedWeight(targetMax: number, pct: number, step: number): number {
  return roundTo((targetMax * pct) / 100, step);
}

/** Suggested cycle target: current max + percent, rounded down to the step so it stays conservative. */
export function suggestTarget(currentMax: number, increasePct = 5, step = 2.5): number {
  return round2(Math.floor((currentMax * (1 + increasePct / 100)) / step) * step);
}

/** Greedy plate breakdown for one side of the bar. `remainder` > 0 means the load can't be matched exactly. */
export function platesPerSide(
  total: number,
  barWeight = 20,
  plates: number[] = DEFAULT_PLATES_KG,
): { plates: number[]; remainder: number } {
  let perSide = round2((total - barWeight) / 2);
  const result: number[] = [];
  if (perSide <= 0) return { plates: result, remainder: 0 };
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (perSide + 1e-9 >= plate) {
      result.push(plate);
      perSide = round2(perSide - plate);
    }
  }
  return { plates: result, remainder: perSide };
}

/** Epley estimated one-rep max. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return round2(weight * (1 + reps / 30));
}

export interface PlannedSet {
  index: number;
  pct: number;
  reps: number;
  weight: number;
}

/** Expands a program session into individual sets with concrete weights. */
export function planSession(week: number, workout: WorkoutId, targetMax: number, step = 2.5): PlannedSet[] {
  const sets: PlannedSet[] = [];
  for (const p of getSession(week, workout).prescriptions) {
    for (let i = 0; i < p.sets; i++) {
      sets.push({ index: sets.length, pct: p.pct, reps: p.reps, weight: prescribedWeight(targetMax, p.pct, step) });
    }
  }
  return sets;
}
