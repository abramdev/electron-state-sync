// 测试设置文件 - mock electron 模块
import { mock } from "bun:test";

// Mock electron 模块
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
