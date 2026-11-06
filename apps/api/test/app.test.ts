import type { Cycle, SyncRecord, SyncResponse } from '@press16/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { SqliteRepository } from '../src/repo/sqlite';

const TOKEN = 'test-token';

const cycle = (id: string, updatedAt: number, targetMax = 105): SyncRecord => ({
  entity: 'cycle',
  data: {
    id,
    updatedAt,
    deleted: false,
    startDate: '2026-09-15',
    currentMax: 100,
    targetMax,
    roundingStep: 2.5,
    barWeight: 20,
    status: 'active',
  } satisfies Cycle,
});

describe('api', () => {
  let repo: SqliteRepository;
  let app: ReturnType<typeof createApp>;

  const sync = async (body: unknown, token = TOKEN) =>
    app.request('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    repo = new SqliteRepository(':memory:');
    app = createApp({ repo, token: TOKEN, pageSize: 2 });
  });

  afterEach(() => repo.close());

  it('serves health without auth', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('rejects sync without a valid token', async () => {
    const res = await sync({ deviceId: 'a', cursor: 0, changes: [] }, 'wrong');
    expect(res.status).toBe(401);
  });

  it('rejects malformed sync bodies', async () => {
    const res = await sync({ deviceId: 'a', cursor: -1, changes: [{ entity: 'nope' }] });
    expect(res.status).toBe(400);
  });

  it('accepts new records and returns them as server changes', async () => {
    const res = await sync({ deviceId: 'a', cursor: 0, changes: [cycle('c1', 1)] });
    const body = (await res.json()) as SyncResponse;
    expect(body).toMatchObject({ accepted: 1, cursor: 1, hasMore: false });
    expect(body.serverChanges).toEqual([cycle('c1', 1)]);
  });

  it('applies last write wins and is idempotent', async () => {
    await sync({ deviceId: 'a', cursor: 0, changes: [cycle('c1', 10, 105)] });
    const stale = (await (await sync({ deviceId: 'b', cursor: 1, changes: [cycle('c1', 5, 999)] })).json()) as SyncResponse;
    expect(stale.accepted).toBe(0);
    const duplicate = (await (await sync({ deviceId: 'a', cursor: 1, changes: [cycle('c1', 10, 105)] })).json()) as SyncResponse;
    expect(duplicate.accepted).toBe(0);
    const newer = (await (await sync({ deviceId: 'b', cursor: 1, changes: [cycle('c1', 20, 110)] })).json()) as SyncResponse;
    expect(newer.accepted).toBe(1);

    const fresh = (await (await sync({ deviceId: 'c', cursor: 0, changes: [] })).json()) as SyncResponse;
    expect(fresh.serverChanges).toEqual([cycle('c1', 20, 110)]);
  });

  it('pages server changes with hasMore and cursor', async () => {
    await sync({ deviceId: 'a', cursor: 0, changes: [cycle('c1', 1), cycle('c2', 1), cycle('c3', 1)] });
    const first = (await (await sync({ deviceId: 'b', cursor: 0, changes: [] })).json()) as SyncResponse;
    expect(first.serverChanges.map((r) => r.data.id)).toEqual(['c1', 'c2']);
    expect(first).toMatchObject({ cursor: 2, hasMore: true });
    const second = (await (await sync({ deviceId: 'b', cursor: first.cursor, changes: [] })).json()) as SyncResponse;
    expect(second.serverChanges.map((r) => r.data.id)).toEqual(['c3']);
    expect(second).toMatchObject({ cursor: 3, hasMore: false });
  });

  it('bootstraps all records for a new device', async () => {
    await sync({ deviceId: 'a', cursor: 0, changes: [cycle('c1', 1), cycle('c2', 1), cycle('c3', 1)] });
    const res = await app.request('/api/bootstrap', { headers: { Authorization: `Bearer ${TOKEN}` } });
    const body = (await res.json()) as { records: SyncRecord[]; cursor: number };
    expect(body.records).toHaveLength(3);
    expect(body.cursor).toBe(3);
  });
});
