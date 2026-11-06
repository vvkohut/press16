# Press16

Offline-first PWA for V.L. Muravyov's 16-week raw bench press program. The app works fully offline (IndexedDB + service worker); the backend is only used for the initial load and for syncing results.

## Layout

| Path | What |
|---|---|
| `packages/shared` | Program table, weight/plate math, record types, sync contract + zod schemas |
| `apps/web` | React + Vite PWA, Dexie (IndexedDB) with an outbox for sync |
| `apps/api` | Hono API (`/api/health`, `/api/bootstrap`, `/api/sync`), SQLite via built-in `node:sqlite` |

## Requirements

Node 24+ (uses `node:sqlite`), npm.

## Run

```sh
npm install
npm test            # shared + api tests
npm run typecheck

# Production-like: build the PWA and serve it together with the API on :8787
PRESS16_TOKEN=choose-a-secret npm start

# Development: API with reload on :8787, Vite on :5173 (proxies /api)
PRESS16_TOKEN=choose-a-secret npm run dev:api
npm run dev:web
```

Open the app, create a cycle, then in **Settings → Sync** enter the same token and press **Save & sync now**. After that, sync runs on launch, when the device comes back online, and after finishing a workout.

API environment variables: `PRESS16_TOKEN` (required), `PORT` (8787), `PRESS16_DB` (`press16.db`), `PRESS16_WEB_DIST` (defaults to `apps/web/dist`).

Service workers require HTTPS except on `localhost`; to test on a phone, put the server behind HTTPS (reverse proxy or tunnel).

## Sync model

- Every local write updates the record and appends an outbox entry.
- `POST /api/sync { deviceId, cursor, changes }` stores records that are newer (last write wins on `updatedAt`) and returns server changes after `cursor`, paged with `hasMore`.
- A new device with cursor 0 receives everything, which restores its data.

## Roadmap

1. ~~Shared program data + math~~
2. ~~Offline web app (setup, workout, program grid, rest timer, plates, export/import)~~
3. ~~API + sync~~
4. Progress charts
5. Docker + Postgres for VPC
6. AWS Lambda: `hono/aws-lambda` handler, DynamoDB repository, S3 + CloudFront for the web app
