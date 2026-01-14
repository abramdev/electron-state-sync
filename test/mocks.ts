// 简单的 electron mock 用于测试
export const ipcMain = {
  handle: () => ({} as any),
  on: () => ({} as any),
  removeHandler: () => {},
  removeListener: () => {},
};

export class IpcMainEvent {
  public readonly sender = new WebContents();
}

export class IpcMainInvokeEvent {
  public readonly sender = new WebContents();
}

export class WebContents {
  public isDestroyed() {
    return false;
  }

  public send() {}

  public once() {}
}
