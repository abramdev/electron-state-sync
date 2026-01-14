import type { SyncStateBridge } from "../types";

declare global {
  interface Window {
    syncState?: SyncStateBridge;
  }
}
