import { describe, expect, test } from "bun:test";

import { createSyncStateChannels } from "../src/channels";

// Test IPC channel generation logic
describe("syncState channels", () => {
  // Test default baseChannel
  test("use default baseChannel", () => {
    // Channel result
    const channels = createSyncStateChannels({ name: "counter" });

    expect(channels).toEqual({
      getChannel: "state:counter:get",
      setChannel: "state:counter:set",
      subscribeChannel: "state:counter:subscribe",
      unsubscribeChannel: "state:counter:unsubscribe",
      updateChannel: "state:counter:update",
    });
  });

  // Test custom baseChannel
  test("use custom baseChannel", () => {
    // Channel result
    const channels = createSyncStateChannels({
      baseChannel: "effect",
      name: "profile",
    });

    expect(channels).toEqual({
      getChannel: "effect:profile:get",
      setChannel: "effect:profile:set",
      subscribeChannel: "effect:profile:subscribe",
      unsubscribeChannel: "effect:profile:unsubscribe",
      updateChannel: "effect:profile:update",
    });
  });
});
