import type { Cycle, SessionLog, SetLog, SyncMeta } from './types';

export type SyncRecord =
  | { entity: 'cycle'; data: Cycle }
  | { entity: 'session'; data: SessionLog }
  | { entity: 'set'; data: SetLog };

export interface SyncRequest {
  deviceId: string;
  /** Last server revision this device has seen (0 = never synced). */
  cursor: number;
  changes: SyncRecord[];
}

export interface SyncResponse {
  accepted: number;
  serverChanges: SyncRecord[];
  cursor: number;
  hasMore: boolean;
}

export interface BootstrapResponse {
  records: SyncRecord[];
  cursor: number;
  serverTime: number;
}

/**
 * Last write wins: the incoming record replaces the stored one only if strictly newer.
 * Equal timestamps keep the stored copy, so re-sending the same change is idempotent.
 */
export function shouldReplace(existing: Pick<SyncMeta, 'updatedAt'> | undefined, incoming: Pick<SyncMeta, 'updatedAt'>): boolean {
  return !existing || incoming.updatedAt > existing.updatedAt;
}
