import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';
import { SqliteRepository } from './repo/sqlite';

const token = process.env.PRESS16_TOKEN;
if (!token) {
  console.error('PRESS16_TOKEN is required (the bearer token devices use to sync).');
  process.exit(1);
}

const port = Number(process.env.PORT ?? 8787);
const repo = new SqliteRepository(process.env.PRESS16_DB ?? 'press16.db');
const app = createApp({ repo, token });

// Serve the built PWA from the same origin so the app and /api share one host.
const webDist = process.env.PRESS16_WEB_DIST ?? fileURLToPath(new URL('../../web/dist', import.meta.url));
if (existsSync(webDist)) {
  app.use('/*', serveStatic({ root: webDist }));
  app.get('*', serveStatic({ path: join(webDist, 'index.html') }));
} else {
  console.warn(`Web build not found at ${webDist}; serving API only.`);
}

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`press16 api listening on http://localhost:${info.port}`);
});

const shutdown = () => {
  server.close();
  repo.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
