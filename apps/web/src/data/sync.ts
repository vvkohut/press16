import { shouldReplace, type SyncRecord, type SyncRequest, type SyncResponse } from '@press16/shared';
import { db } from './db';

const MAX_ROUNDS = 20;
const BATCH = 200;

async function getKv<T>(key: string, fallback: T): Promise<T> {
  const entry = await db.kv.get(key);
  return entry === undefined ? fallback : (entry.value as T);
}

const setKv = (key: string, value: unknown) => db.kv.put({ key, value });

export interface SyncSettings {
  apiUrl: string;
  syncToken: string;
}

export async function getSyncSettings(): Promise<SyncSettings> {
  return { apiUrl: await getKv('apiUrl', ''), syncToken: await getKv('syncToken', '') };
}

export async function saveSyncSettings(settings: SyncSettings): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    await setKv('apiUrl', settings.apiUrl.trim().replace(/\/+$/, ''));
    await setKv('syncToken', settings.syncToken.trim());
  });
}

export interface SyncStatus {
  lastSyncAt: number | null;
  lastError: string | null;
  pending: number;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return {
    lastSyncAt: await getKv<number | null>('lastSyncAt', null),
    lastError: await getKv<string | null>('lastSyncError', null),
    pending: await db.outbox.count(),
  };
}

async function deviceId(): Promise<string> {
  const existing = await getKv<string | null>('deviceId', null);
  if (existing) return existing;
  const id = crypto.randomUUID();
  await setKv('deviceId', id);
  return id;
}

/** Current state of every record referenced by the oldest outbox entries (one change per record). */
async function collectChanges(): Promise<{ changes: SyncRecord[]; maxSeq: number }> {
  const entries = await db.outbox.orderBy('seq').limit(BATCH).toArray();
  const seen = new Set<string>();
  const changes: SyncRecord[] = [];
  for (const entry of entries) {
    const key = `${entry.entity}:${entry.recordId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (entry.entity === 'cycle') {
      const data = await db.cycles.get(entry.recordId);
      if (data) changes.push({ entity: 'cycle', data });
    } else if (entry.entity === 'session') {
      const data = await db.sessions.get(entry.recordId);
      if (data) changes.push({ entity: 'session', data });
    } else {
      const data = await db.sets.get(entry.recordId);
      if (data) changes.push({ entity: 'set', data });
    }
  }
  return { changes, maxSeq: entries.at(-1)?.seq ?? 0 };
}

/** Applies server records locally without queueing them back to the outbox. */
async function applyServerChanges(records: SyncRecord[]) {
  for (const record of records) {
    if (record.entity === 'cycle') {
      if (shouldReplace(await db.cycles.get(record.data.id), record.data)) await db.cycles.put(record.data);
    } else if (record.entity === 'session') {
      if (shouldReplace(await db.sessions.get(record.data.id), record.data)) await db.sessions.put(record.data);
    } else if (shouldReplace(await db.sets.get(record.data.id), record.data)) {
      await db.sets.put(record.data);
    }
  }
}

let running: Promise<number> | null = null;

/** Pushes the outbox and pulls server changes until both are drained. Returns records pushed. */
export function syncNow(): Promise<number> {
  running ??= runSync().finally(() => {
    running = null;
  });
  return running;
}

async function runSync(): Promise<number> {
  const { apiUrl, syncToken } = await getSyncSettings();
  if (!syncToken) throw new Error('Set a sync token in Settings first.');
  const id = await deviceId();
  let pushed = 0;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const cursor = await getKv('cursor', 0);
      const { changes, maxSeq } = await collectChanges();
      const request: SyncRequest = { deviceId: id, cursor, changes };
      const res = await fetch(`${apiUrl}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${syncToken}` },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Sync token rejected by server.' : `Sync failed (HTTP ${res.status}).`);
      const body = (await res.json()) as SyncResponse;

      await db.transaction('rw', [db.cycles, db.sessions, db.sets, db.outbox, db.kv], async () => {
        // Entries added while the request was in flight have a higher seq and stay queued.
        if (maxSeq > 0) await db.outbox.where('seq').belowOrEqual(maxSeq).delete();
        await applyServerChanges(body.serverChanges);
        await setKv('cursor', body.cursor);
      });
      pushed += changes.length;

      if (!body.hasMore && (await db.outbox.count()) === 0) break;
    }
    await db.transaction('rw', db.kv, async () => {
      await setKv('lastSyncAt', Date.now());
      await setKv('lastSyncError', null);
    });
    return pushed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setKv('lastSyncError', navigator.onLine ? message : 'Offline — will sync when back online.');
    throw error;
  }
}

/** Fire-and-forget sync used by automatic triggers; silent when not configured or offline. */
export async function syncInBackground(): Promise<void> {
  const { syncToken } = await getSyncSettings();
  if (!syncToken || !navigator.onLine) return;
  await syncNow().catch(() => undefined);
}
