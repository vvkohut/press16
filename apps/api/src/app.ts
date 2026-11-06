import { syncRequestSchema, type BootstrapResponse, type SyncResponse } from '@press16/shared';
import { Hono } from 'hono';
import { bearerAuth } from 'hono/bearer-auth';
import type { Repository } from './repo/repository';

export interface AppDeps {
  repo: Repository;
  token: string;
  /** Single user in v1; becomes the authenticated user's id once real auth is added. */
  userId?: string;
  pageSize?: number;
}

/** Runtime-agnostic app: mounted by src/server.ts on Node, and by a Lambda handler later. */
export function createApp({ repo, token, userId = 'default', pageSize = 500 }: AppDeps) {
  const app = new Hono();

  app.get('/api/health', (c) => c.json({ ok: true }));

  app.use('/api/*', bearerAuth({ token }));

  app.get('/api/bootstrap', async (c) => {
    const page = await repo.changesSince(userId, 0, Number.MAX_SAFE_INTEGER);
    return c.json<BootstrapResponse>({ records: page.records, cursor: page.cursor, serverTime: Date.now() });
  });

  app.post('/api/sync', async (c) => {
    const parsed = syncRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: 'Invalid sync request', issues: parsed.error.issues }, 400);

    const accepted = await repo.upsertIfNewer(userId, parsed.data.changes);
    const page = await repo.changesSince(userId, parsed.data.cursor, pageSize);
    return c.json<SyncResponse>({ accepted, serverChanges: page.records, cursor: page.cursor, hasMore: page.hasMore });
  });

  return app;
}
