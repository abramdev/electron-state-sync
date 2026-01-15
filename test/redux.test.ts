import { configureStore, createSlice, type Middleware, type PayloadAction } from "@reduxjs/toolkit";
import { describe, expect, test, spyOn } from "bun:test";

import { createSyncActionCreator, syncStateMiddleware } from "../src/renderer/redux";
import type { SyncStateBridge } from "../src/types";

// 构造可控的桥接对象，便于观察同步调用
const createBridgeController = (): { bridge: SyncStateBridge } => {
	const bridge: SyncStateBridge = {
		get: async <Value>() => undefined as unknown as Value,
		set: async () => undefined,
		subscribe: <Value>(_options, _listener: (value: Value) => void) => () => undefined,
	};

	return { bridge };
};

// 创建计数器 slice，便于复用
const createCounterSlice = () =>
	createSlice({
		initialState: 0,
		name: "counter",
		reducers: {
			setValue: (_state, action: PayloadAction<number>) => action.payload,
		},
	});

describe("redux sync", () => {
	test("createSyncActionCreator avoids duplicate middleware sync", () => {
		const { bridge } = createBridgeController();
		const setSpy = spyOn(bridge, "set");
		const counterSlice = createCounterSlice();

		// 兼容测试类型的同步中间件
		const syncMiddleware = syncStateMiddleware({
			name: "counter",
			selector: (state: unknown) => state,
			actionType: counterSlice.actions.setValue.type,
			bridge,
		}) as unknown as Middleware<{}, number>;

		const store = configureStore({
			reducer: counterSlice.reducer,
			middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(syncMiddleware),
		});

		const syncAction = createSyncActionCreator<number>(counterSlice.actions.setValue.type, {
			name: "counter",
			bridge,
		});

		store.dispatch(syncAction(5));

		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy.mock.calls[0]?.[1]).toBe(5);
	});

	test("syncStateMiddleware still syncs normal actions", () => {
		const { bridge } = createBridgeController();
		const setSpy = spyOn(bridge, "set");
		const counterSlice = createCounterSlice();

		// 兼容测试类型的同步中间件
		const syncMiddleware = syncStateMiddleware({
			name: "counter",
			selector: (state: unknown) => state,
			actionType: counterSlice.actions.setValue.type,
			bridge,
		}) as unknown as Middleware<{}, number>;

		const store = configureStore({
			reducer: counterSlice.reducer,
			middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(syncMiddleware),
		});

		store.dispatch(counterSlice.actions.setValue(3));

		expect(setSpy).toHaveBeenCalledTimes(1);
		expect(setSpy.mock.calls[0]?.[1]).toBe(3);
	});
});
