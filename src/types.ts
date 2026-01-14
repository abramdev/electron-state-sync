import type { SyncStateChannelOptions } from "./channels";

// State update callback
export type SyncStateListener<StateValue> = (value: StateValue) => void;

// Sync error codes
export type SyncStateErrorCode = "RENDERER_READONLY" | "RENDERER_INVALID_VALUE";

// Sync error object
export class SyncStateError extends Error {
  // Error code
  public readonly code: SyncStateErrorCode;
  // State name
  public readonly stateName?: string;
  // Channel base prefix
  public readonly baseChannel?: string;
  // Original error
  public readonly cause?: Error;

  // Construct sync error
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

    // Maintain correct stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SyncStateError);
    }
  }

  // Get full error message (with context)
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

// Sync bridge API available in renderer layer
export interface SyncStateBridge {
  // Get main process current value
  get: <StateValue>(options: SyncStateChannelOptions) => Promise<StateValue>;
  // Write to main process and trigger sync
  set: <StateValue>(options: SyncStateChannelOptions, value: StateValue) => Promise<void>;
  // Subscribe to main process updates
  subscribe: <StateValue>(
    options: SyncStateChannelOptions,
    listener: SyncStateListener<StateValue>,
  ) => () => void;
}
