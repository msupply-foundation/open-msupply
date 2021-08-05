import { CombinedState, combineReducers, Middleware } from 'redux';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { ApiSlice } from './ApiSlice';

export interface Action {
  type: string;
  payload?: string | boolean | number;
}
export type Reducers = Record<string, Reducer>;
export type Reducer = (state: State | undefined, action: Action) => State;
export type State = Record<string, any>;
interface ReducerManager {
  getReducerMap: () => Reducers;
  reduce: (state: State | undefined, action: Action) => CombinedState<State>;
  add: (key: string, reducer: Reducer) => void;
  remove: (key: string) => void;
}

export function createReducerManager(
  initialReducers: Reducers
): ReducerManager {
  // Create an object which maps keys to reducers
  const reducers = { ...initialReducers };

  // Create the initial combinedReducer
  let combinedReducer = combineReducers(reducers);

  // An array which is used to delete state keys when reducers are removed
  let keysToRemove: string[] = [];

  return {
    getReducerMap: () => reducers,

    // The root reducer function exposed by this object
    // This will be passed to the store
    reduce: (state: State | undefined, action: Action) => {
      // If any reducers have been removed, clean up their state first
      if (keysToRemove.length > 0) {
        state = { ...state };
        for (const key of keysToRemove) {
          delete state[key];
        }
        keysToRemove = [];
      }

      // Delegate to the combined reducer
      return combinedReducer(state, action);
    },

    // Adds a new reducer with the specified key
    add: (key: string, reducer: Reducer) => {
      if (!key || reducers[key]) {
        return;
      }

      // Add the reducer to the reducer mapping
      reducers[key] = reducer;

      // Generate a new combined reducer
      combinedReducer = combineReducers(reducers);
    },

    // Removes a reducer with the specified key
    remove: (key: string) => {
      if (!key || !reducers[key]) {
        return;
      }

      // Remove it from the reducer mapping
      delete reducers[key];

      // Add the key to the list of keys to clean up
      keysToRemove.push(key);

      // Generate a new combined reducer
      combinedReducer = combineReducers(reducers);
    },
  };
}

const staticReducers = {
  api: ApiSlice.reducer,
};

interface FederatedStore
  extends EnhancedStore<State, Action, Middleware<State>[]> {
  reducerManager?: ReducerManager;
}

export const makeStore = (): FederatedStore => {
  const reducerManager = createReducerManager(staticReducers as Reducers);

  // Create a store with the root reducer function being the one exposed by the manager.
  const store: FederatedStore = configureStore<State, Action, Middleware[]>({
    reducer: reducerManager.reduce,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(ApiSlice.middleware),
  });

  // Optional: Put the reducer manager on the store so it is easily accessible
  store.reducerManager = reducerManager;

  return store;
};

export const store = makeStore();
