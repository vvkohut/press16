import { describe, expect, it } from 'vitest';
import { shouldReplace } from '../src/sync';

describe('shouldReplace (last write wins)', () => {
  it('accepts a record that does not exist yet', () => {
    expect(shouldReplace(undefined, { updatedAt: 1 })).toBe(true);
  });

  it('accepts only strictly newer records', () => {
    expect(shouldReplace({ updatedAt: 10 }, { updatedAt: 11 })).toBe(true);
    expect(shouldReplace({ updatedAt: 10 }, { updatedAt: 9 })).toBe(false);
  });

  it('ignores a duplicate with the same timestamp (idempotent re-send)', () => {
    expect(shouldReplace({ updatedAt: 10 }, { updatedAt: 10 })).toBe(false);
  });
});
