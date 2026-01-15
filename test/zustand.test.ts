import { describe, expect, test, spyOn } from "bun:test";
import { createStore } from "zustand/vanilla";

import { createSyncedStore, syncStateMiddleware } from "../src/renderer/zustand";
import type { SyncStateBridge } from "../src/types";

// 构造可控的桥接对象，方便触发远程更新
const createBridgeController = <StateValue>(initialRemoteValue: StateValue) => {
	// 远程更新回调缓存
	let listener: ((value: unknown) => void) | undefined;

	const bridge: SyncStateBridge = {
		get: async <Value>() => initialRemoteValue as unknown as Value,
		set: async () => undefined,
		subscribe: <Value>(_options, callback: (value: Value) => void) => {
			listener = callback as (value: unknown) => void;
			return () => {
				listener = undefined;
			};
		},
	};

	// 触发远程更新回调
	const emit = (value: StateValue): void => {
		(listener as ((payload: StateValue) => void) | undefined)?.(value);
	};

	return { bridge, emit };
};

describe("zustand sync", () => {
	test("middleware keeps local sync after remote update", async () => {
		const { bridge, emit } = createBridgeController({ count: 1 });
		const setSpy = spyOn(bridge, "set");

		const store = createStore(
			syncStateMiddleware({ name: "counter", bridge })((set) => ({
				count: 0,
			}))
		);

		await Promise.resolve();

		emit({ count: 1 });
		store.setState({ count: 2 });

		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy.mock.calls[0]?.[1]).toEqual({ count: 2 });
	});

	test("createSyncedStore keeps local sync after remote update", async () => {
		const { bridge, emit } = createBridgeController({ count: 0 });
		const setSpy = spyOn(bridge, "set");

		const store = createSyncedStore({ count: 0 }, { name: "counter", bridge });

		await Promise.resolve();

		emit({ count: 3 });
		store.setState({ count: 4 });

		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy.mock.calls[0]?.[1]).toEqual({ count: 4 });
	});
});
