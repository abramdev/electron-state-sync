import type { SyncStateChannelOptions } from "./channels";

export type SyncStateListener<StateValue> = (value: StateValue) => void;

export type SyncStateErrorCode = "RENDERER_READONLY" | "RENDERER_INVALID_VALUE";

export class SyncStateError extends Error {
  public readonly code: SyncStateErrorCode;
  public readonly stateName?: string;
  public readonly baseChannel?: string;
  public readonly cause?: Error;

  public constructor(
    code: SyncStateErrorCode,
    message: string,
    context?: { stateName?: string; baseChannel?: string; cause?: Error },
  ) {
    super(message);
    this.code = code;
    this.name = "SyncStateError";
    this.stateName = context?.stateName;
    this.baseChannel = context?.baseChannel;
    this.cause = context?.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SyncStateError);
    }
  }

  public getFullMessage(): string {
    const parts = [this.message];
    if (this.stateName) {
      parts.push(`\n  State name: "${this.stateName}"`);
    }
    if (this.baseChannel) {
      parts.push(`\n  Channel prefix: "${this.baseChannel}"`);
    }
    if (this.cause) {
      parts.push(`\n  Original error: ${this.cause.message}`);
    }
    return parts.join("");
  }
}

export interface SyncStateBridge {
  get: <StateValue>(options: SyncStateChannelOptions) => Promise<StateValue>;
  set: <StateValue>(options: SyncStateChannelOptions, value: StateValue) => Promise<void>;
  subscribe: <StateValue>(
    options: SyncStateChannelOptions,
    listener: SyncStateListener<StateValue>,
  ) => () => void;
}
