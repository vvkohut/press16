import type { SyncRecord } from '@press16/shared';

export interface ChangePage {
  records: SyncRecord[];
  /** Highest revision included in this page (unchanged cursor when empty). */
  cursor: number;
  hasMore: boolean;
}

/**
 * Storage port. Implementations: SQLite (local / VPC) now; DynamoDB or Postgres for Lambda later.
 * Every stored record gets a server revision that increases on each accepted write.
 */
export interface Repository {
  /** Stores records that are newer than the stored copy; returns how many were accepted. */
  upsertIfNewer(userId: string, records: SyncRecord[]): Promise<number>;
  /** Records written after `cursor`, ordered by revision. */
  changesSince(userId: string, cursor: number, limit: number): Promise<ChangePage>;
  close(): void;
}
