import type { WorkoutId } from './program';

/** Fields every synced record carries. `updatedAt` is epoch ms; last write wins. */
export interface SyncMeta {
  id: string;
  updatedAt: number;
  deleted: boolean;
}

export type CycleStatus = 'active' | 'completed' | 'abandoned';

export interface Cycle extends SyncMeta {
  startDate: string;
  currentMax: number;
  targetMax: number;
  roundingStep: number;
  barWeight: number;
  status: CycleStatus;
}

export type SessionStatus = 'planned' | 'done' | 'skipped';

export interface SessionLog extends SyncMeta {
  cycleId: string;
  week: number;
  workout: WorkoutId | 'extra';
  date: string | null;
  status: SessionStatus;
  notes: string;
}

export interface SetLog extends SyncMeta {
  sessionId: string;
  index: number;
  pct: number;
  plannedReps: number;
  plannedWeight: number;
  actualReps: number | null;
  actualWeight: number | null;
  done: boolean;
}

export interface Settings {
  apiUrl: string;
  syncToken: string;
  unit: 'kg';
  restSeconds: number;
}

export type SyncEntity = 'cycle' | 'session' | 'set';
