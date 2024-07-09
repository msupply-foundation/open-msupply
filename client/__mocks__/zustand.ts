import { act } from 'react';
import { create as actualCreate, StateCreator, useStore } from 'zustand';

/**
 * This mock adds functionality to standard zustand by resetting to the
 * initial state after each test.
 */

// eslint-disable-next-line @typescript-eslint/ban-types
const stores = new Set<Function>();

const create = <S>(createState: StateCreator<S>) => {
  const store = actualCreate<S>(createState);
  const initialState = store.getState();
  stores.add(() => act(() => store.setState(initialState, true)));
  return store;
};

afterEach(() => {
  stores.forEach(resetFn => resetFn());
});

export default create;
export { create, useStore };
