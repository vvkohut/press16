import { DatabaseSync } from 'node:sqlite';
import { shouldReplace, type SyncRecord } from '@press16/shared';
import type { ChangePage, Repository } from './repository';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS records (
    user_id    TEXT    NOT NULL,
    entity     TEXT    NOT NULL,
    id         TEXT    NOT NULL,
    updated_at INTEGER NOT NULL,
    rev        INTEGER NOT NULL,
    data       TEXT    NOT NULL,
    PRIMARY KEY (user_id, entity, id)
  );
  CREATE INDEX IF NOT EXISTS records_user_rev ON records (user_id, rev);
`;

export class SqliteRepository implements Repository {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(SCHEMA);
  }

  async upsertIfNewer(userId: string, records: SyncRecord[]): Promise<number> {
    const current = this.db.prepare('SELECT updated_at FROM records WHERE user_id = ? AND entity = ? AND id = ?');
    const put = this.db.prepare(`
      INSERT INTO records (user_id, entity, id, updated_at, rev, data) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, entity, id) DO UPDATE SET updated_at = excluded.updated_at, rev = excluded.rev, data = excluded.data
    `);

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const maxRev = this.db.prepare('SELECT COALESCE(MAX(rev), 0) AS rev FROM records').get() as unknown as { rev: number };
      let rev = Number(maxRev.rev);
      let accepted = 0;
      for (const record of records) {
        const row = current.get(userId, record.entity, record.data.id) as unknown as { updated_at: number } | undefined;
        if (!shouldReplace(row && { updatedAt: Number(row.updated_at) }, record.data)) continue;
        put.run(userId, record.entity, record.data.id, record.data.updatedAt, ++rev, JSON.stringify(record.data));
        accepted++;
      }
      this.db.exec('COMMIT');
      return accepted;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  async changesSince(userId: string, cursor: number, limit: number): Promise<ChangePage> {
    const rows = this.db
      .prepare('SELECT entity, rev, data FROM records WHERE user_id = ? AND rev > ? ORDER BY rev LIMIT ?')
      .all(userId, cursor, limit + 1) as unknown as { entity: SyncRecord['entity']; rev: number; data: string }[];
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      records: page.map((row) => ({ entity: row.entity, data: JSON.parse(row.data) }) as SyncRecord),
      cursor: last ? Number(last.rev) : cursor,
      hasMore: rows.length > limit,
    };
  }

  close(): void {
    this.db.close();
  }
}
