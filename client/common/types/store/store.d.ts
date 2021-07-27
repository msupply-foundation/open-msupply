import { CombinedState, Middleware } from 'redux';
import { EnhancedStore } from '@reduxjs/toolkit';
export interface Action {
    type: string;
    payload?: string | boolean | number;
}
export declare type Reducers = Record<string, Reducer>;
export declare type Reducer = (state: State | undefined, action: Action) => State;
export declare type State = Record<string, any>;
interface ReducerManager {
    getReducerMap: () => Reducers;
    reduce: (state: State | undefined, action: Action) => CombinedState<State>;
    add: (key: string, reducer: Reducer) => void;
    remove: (key: string) => void;
}
export declare function createReducerManager(initialReducers: Reducers): ReducerManager;
interface FederatedStore extends EnhancedStore<State, Action, Middleware<State>[]> {
    reducerManager?: ReducerManager;
}
export declare const makeStore: () => FederatedStore;
export declare const store: FederatedStore;
export {};
//# sourceMappingURL=store.d.ts.map