export declare function createReducerManager(initialReducers: any): {
    getReducerMap: () => any;
    reduce: (state: any, action: any) => import("redux").CombinedState<{
        [x: string]: unknown;
    }>;
    add: (key: any, reducer: any) => void;
    remove: (key: any) => void;
};
export declare const makeStore: () => import("@reduxjs/toolkit").EnhancedStore<import("redux").CombinedState<{
    [x: string]: unknown;
}>, any, [import("redux-thunk").ThunkMiddleware<import("redux").CombinedState<{
    [x: string]: unknown;
}>, import("redux").AnyAction, null> | import("redux-thunk").ThunkMiddleware<import("redux").CombinedState<{
    [x: string]: unknown;
}>, import("redux").AnyAction, undefined>]>;
export declare const store: import("@reduxjs/toolkit").EnhancedStore<import("redux").CombinedState<{
    [x: string]: unknown;
}>, any, [import("redux-thunk").ThunkMiddleware<import("redux").CombinedState<{
    [x: string]: unknown;
}>, import("redux").AnyAction, null> | import("redux-thunk").ThunkMiddleware<import("redux").CombinedState<{
    [x: string]: unknown;
}>, import("redux").AnyAction, undefined>]>;
//# sourceMappingURL=store.d.ts.map