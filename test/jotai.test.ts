import { describe, expect, test } from "bun:test";
import { createStore } from "jotai/vanilla";

import { cleanupSyncedAtom, syncStateAtom } from "../src/renderer/jotai";
import type { SyncStateBridge } from "../src/types";

// 构造可控的桥接对象，方便触发远程更新
const createBridgeController = <StateValue>(initialRemoteValue: StateValue) => {
	// 远程更新回调缓存
	let listener: ((value: unknown) => void) | undefined;
	// 标记是否调用了取消订阅
	const unsubscribeFlag = { value: false };

	const bridge: SyncStateBridge = {
		get: async <Value>() => initialRemoteValue as unknown as Value,
		set: async () => undefined,
		subscribe: <Value>(_options, callback: (value: Value) => void) => {
			listener = callback as (value: unknown) => void;
			return () => {
				unsubscribeFlag.value = true;
				listener = undefined;
			};
		},
	};

	// 触发远程更新回调
	const emit = (value: StateValue): void => {
		(listener as ((payload: StateValue) => void) | undefined)?.(value);
	};

	return { bridge, emit, unsubscribeFlag };
};

describe("syncStateAtom", () => {
	test("apply pending remote updates before mount", async () => {
		const { bridge, emit, unsubscribeFlag } = createBridgeController(5);
		const syncedAtom = syncStateAtom(0, { name: "counter", bridge });

		emit(5);

		const store = createStore();
		const unsubscribe = store.sub(syncedAtom, () => undefined);

		await Promise.resolve();

		expect(store.get(syncedAtom)).toBe(5);

		emit(7);
		expect(store.get(syncedAtom)).toBe(7);

		cleanupSyncedAtom({ name: "counter", bridge });
		expect(unsubscribeFlag.value).toBe(true);

		unsubscribe();
	});
});
