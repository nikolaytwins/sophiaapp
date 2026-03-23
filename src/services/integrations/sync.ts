/**
 * Future: bidirectional sync with your web service.
 * Keep entities with `updatedAt` + `source` for conflict resolution.
 */
export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncEngine {
  push(): Promise<void>;
  pull(): Promise<void>;
}

export const syncStub: SyncEngine = {
  async push() {},
  async pull() {},
};
