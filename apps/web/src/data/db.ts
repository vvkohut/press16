import Dexie, { type EntityTable } from 'dexie';
import type { Cycle, SessionLog, SetLog, SyncEntity } from '@press16/shared';

/** A local change waiting to be pushed to the server. */
export interface OutboxEntry {
  seq: number;
  entity: SyncEntity;
  recordId: string;
  updatedAt: number;
}

/** Device-local key/value settings (not synced). */
export interface KeyValue {
  key: string;
  value: unknown;
}

export const db = new Dexie('press16') as Dexie & {
  cycles: EntityTable<Cycle, 'id'>;
  sessions: EntityTable<SessionLog, 'id'>;
  sets: EntityTable<SetLog, 'id'>;
  outbox: EntityTable<OutboxEntry, 'seq'>;
  kv: EntityTable<KeyValue, 'key'>;
};

db.version(1).stores({
  cycles: 'id, status, updatedAt',
  sessions: 'id, cycleId, [cycleId+week+workout], updatedAt',
  sets: 'id, sessionId, updatedAt',
  outbox: '++seq, [entity+recordId]',
  kv: 'key',
});
