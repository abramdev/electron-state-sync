// Test setup file - mock electron module
import { mock } from "bun:test";

// Mock electron module
mock.module("electron", () => {
  return {
    ipcMain: {
      handle: () => ({} as any),
      on: () => ({} as any),
      removeHandler: () => {},
      removeListener: () => {},
    },
    IpcMainEvent: class IpcMainEvent {
      public readonly sender = new (class WebContents {
        public isDestroyed() {
          return false;
        }
        public send() {}
        public once() {}
      })();
    },
    IpcMainInvokeEvent: class IpcMainInvokeEvent {
      public readonly sender = new (class WebContents {
        public isDestroyed() {
          return false;
        }
        public send() {}
        public once() {}
      })();
    },
    WebContents: class WebContents {
      public isDestroyed() {
        return false;
      }
      public send() {}
      public once() {}
    },
  };
});
