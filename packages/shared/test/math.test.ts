import { describe, expect, it } from 'vitest';
import { estimateOneRepMax, planSession, platesPerSide, prescribedWeight, roundTo, suggestTarget } from '../src/math';

describe('weight math', () => {
  it('rounds to the nearest step', () => {
    expect(roundTo(76.9, 2.5)).toBe(77.5);
    expect(roundTo(76.2, 2.5)).toBe(75);
    expect(roundTo(66.3, 1.25)).toBe(66.25);
  });

  it('computes prescribed weight from target and percent', () => {
    expect(prescribedWeight(110, 60, 2.5)).toBe(65);
    expect(prescribedWeight(110, 65, 2.5)).toBe(72.5);
    expect(prescribedWeight(110, 97.5, 2.5)).toBe(107.5);
  });

  it('suggests a conservative target', () => {
    expect(suggestTarget(100)).toBe(105);
    expect(suggestTarget(107)).toBe(110);
  });

  it('breaks weight into plates per side', () => {
    expect(platesPerSide(100)).toEqual({ plates: [25, 15], remainder: 0 });
    expect(platesPerSide(72.5)).toEqual({ plates: [25, 1.25], remainder: 0 });
    expect(platesPerSide(20)).toEqual({ plates: [], remainder: 0 });
    expect(platesPerSide(61, 20, [20, 1.25]).remainder).toBe(0.5);
  });

  it('estimates one-rep max with Epley', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 5)).toBe(116.67);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });

  it('expands a session into individual sets', () => {
    const sets = planSession(1, 'II', 100);
    expect(sets.map((s) => [s.pct, s.reps, s.weight])).toEqual([
      [60, 5, 60],
      [65, 5, 65],
      [70, 5, 70],
      [70, 5, 70],
    ]);
    expect(sets.map((s) => s.index)).toEqual([0, 1, 2, 3]);
  });
});
