import {
  PROGRAM,
  type Cycle,
  type PlannedSet,
  type SessionLog,
  type SessionStatus,
  type SetLog,
  type WorkoutId,
} from '@press16/shared';
import { db } from './db';

export interface SessionRef {
  week: number;
  workout: WorkoutId;
}

const now = () => Date.now();

export const todayIso = () => new Date().toLocaleDateString('en-CA');

const newId = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

// The scope must be a native async function: Dexie only keeps the transaction alive across
// nested `await`s of other async functions when it detects an async scope. Passing a plain
// arrow (e.g. `() => upsertSet(...)`) lets it commit early and reject with PrematureCommitError.
const tx = <T>(fn: () => Promise<T>) =>
  db.transaction('rw', [db.cycles, db.sessions, db.sets, db.outbox], async () => await fn());

async function saveCycle(cycle: Cycle) {
  await db.cycles.put(cycle);
  await db.outbox.add({ entity: 'cycle', recordId: cycle.id, updatedAt: cycle.updatedAt });
}

async function saveSession(session: SessionLog) {
  await db.sessions.put(session);
  await db.outbox.add({ entity: 'session', recordId: session.id, updatedAt: session.updatedAt });
}

async function saveSet(set: SetLog) {
  await db.sets.put(set);
  await db.outbox.add({ entity: 'set', recordId: set.id, updatedAt: set.updatedAt });
}

export async function getActiveCycle(): Promise<Cycle | null> {
  const cycle = await db.cycles
    .where('status')
    .equals('active')
    .filter((c) => !c.deleted)
    .first();
  return cycle ?? null;
}

export async function listSessions(cycleId: string): Promise<SessionLog[]> {
  return (await db.sessions.where('cycleId').equals(cycleId).toArray()).filter((s) => !s.deleted);
}

export async function listSets(sessionId: string): Promise<SetLog[]> {
  return (await db.sets.where('sessionId').equals(sessionId).toArray()).filter((s) => !s.deleted);
}

export interface NewCycleInput {
  currentMax: number;
  targetMax: number;
  roundingStep: number;
  barWeight: number;
  startDate: string;
}

export function createCycle(input: NewCycleInput): Promise<Cycle> {
  return tx(async () => {
    const active = await db.cycles.where('status').equals('active').toArray();
    for (const c of active) await saveCycle({ ...c, status: 'abandoned', updatedAt: now() });
    const cycle: Cycle = { id: newId(), updatedAt: now(), deleted: false, status: 'active', ...input };
    await saveCycle(cycle);
    return cycle;
  });
}

export function updateCycle(cycle: Cycle, patch: Partial<Omit<Cycle, 'id'>>): Promise<void> {
  return tx(() => saveCycle({ ...cycle, ...patch, updatedAt: now() }));
}

async function ensureSession(cycle: Cycle, ref: SessionRef): Promise<SessionLog> {
  const existing = await db.sessions
    .where('[cycleId+week+workout]')
    .equals([cycle.id, ref.week, ref.workout])
    .filter((s) => !s.deleted)
    .first();
  if (existing) return existing;
  const session: SessionLog = {
    id: newId(),
    updatedAt: now(),
    deleted: false,
    cycleId: cycle.id,
    week: ref.week,
    workout: ref.workout,
    date: null,
    status: 'planned',
    notes: '',
  };
  await saveSession(session);
  return session;
}

async function upsertSet(cycle: Cycle, ref: SessionRef, planned: PlannedSet, patch: Partial<SetLog>) {
  const session = await ensureSession(cycle, ref);
  const existing = (await listSets(session.id)).find((s) => s.index === planned.index);
  const base: SetLog = existing ?? {
    id: newId(),
    updatedAt: now(),
    deleted: false,
    sessionId: session.id,
    index: planned.index,
    pct: planned.pct,
    plannedReps: planned.reps,
    plannedWeight: planned.weight,
    actualReps: planned.reps,
    actualWeight: planned.weight,
    done: false,
  };
  await saveSet({ ...base, ...patch, updatedAt: now() });
  if (patch.done && !session.date) await saveSession({ ...session, date: todayIso(), updatedAt: now() });
}

export function toggleSet(cycle: Cycle, ref: SessionRef, planned: PlannedSet, done: boolean): Promise<void> {
  return tx(() => upsertSet(cycle, ref, planned, { done }));
}

export function updateSetActual(
  cycle: Cycle,
  ref: SessionRef,
  planned: PlannedSet,
  patch: { actualReps?: number; actualWeight?: number },
): Promise<void> {
  return tx(() => upsertSet(cycle, ref, planned, patch));
}

export function setSessionStatus(cycle: Cycle, ref: SessionRef, status: SessionStatus): Promise<void> {
  return tx(async () => {
    const session = await ensureSession(cycle, ref);
    await saveSession({ ...session, status, date: session.date ?? todayIso(), updatedAt: now() });
  });
}

/** First program session that isn't done or skipped; null when all 16 weeks are finished. */
export function nextSession(sessions: SessionLog[]): SessionRef | null {
  for (const { week, workout } of PROGRAM) {
    const log = sessions.find((s) => s.week === week && s.workout === workout);
    if (!log || log.status === 'planned') return { week, workout };
  }
  return null;
}

export interface ExportFile {
  app: 'press16';
  version: 1;
  exportedAt: string;
  cycles: Cycle[];
  sessions: SessionLog[];
  sets: SetLog[];
}

export async function exportData(): Promise<ExportFile> {
  const [cycles, sessions, sets] = await Promise.all([db.cycles.toArray(), db.sessions.toArray(), db.sets.toArray()]);
  return { app: 'press16', version: 1, exportedAt: new Date().toISOString(), cycles, sessions, sets };
}

const isRecordArray = (value: unknown): value is { id: string; updatedAt: number }[] =>
  Array.isArray(value) &&
  value.every((r) => typeof r === 'object' && r !== null && typeof r.id === 'string' && typeof r.updatedAt === 'number');

/** Imports an export file; a record replaces the local copy only if it is newer (last write wins). */
export function importData(data: unknown): Promise<number> {
  const file = data as Partial<ExportFile> | null;
  if (!file || file.app !== 'press16' || !isRecordArray(file.cycles) || !isRecordArray(file.sessions) || !isRecordArray(file.sets)) {
    return Promise.reject(new Error('Not a Press16 export file'));
  }
  const { cycles, sessions, sets } = file as ExportFile;
  return tx(async () => {
    let imported = 0;
    for (const c of cycles) {
      const local = await db.cycles.get(c.id);
      if (!local || local.updatedAt < c.updatedAt) (await saveCycle(c), imported++);
    }
    for (const s of sessions) {
      const local = await db.sessions.get(s.id);
      if (!local || local.updatedAt < s.updatedAt) (await saveSession(s), imported++);
    }
    for (const s of sets) {
      const local = await db.sets.get(s.id);
      if (!local || local.updatedAt < s.updatedAt) (await saveSet(s), imported++);
    }
    return imported;
  });
}

export async function getRestSeconds(): Promise<number> {
  const entry = await db.kv.get('restSeconds');
  return typeof entry?.value === 'number' ? entry.value : 180;
}

export async function setRestSeconds(seconds: number): Promise<void> {
  await db.kv.put({ key: 'restSeconds', value: seconds });
}
