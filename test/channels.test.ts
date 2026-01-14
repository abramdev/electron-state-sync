import { describe, expect, test } from "bun:test";

import { createSyncStateChannels } from "../src/channels";

// 测试 IPC 通道生成逻辑
describe("syncState 通道", () => {
  // 测试默认 baseChannel
  test("使用默认 baseChannel", () => {
    // 通道结果
    const channels = createSyncStateChannels({ name: "counter" });

    expect(channels).toEqual({
      getChannel: "state:counter:get",
      setChannel: "state:counter:set",
      subscribeChannel: "state:counter:subscribe",
      unsubscribeChannel: "state:counter:unsubscribe",
      updateChannel: "state:counter:update",
    });
  });

  // 测试自定义 baseChannel
  test("使用自定义 baseChannel", () => {
    // 通道结果
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
