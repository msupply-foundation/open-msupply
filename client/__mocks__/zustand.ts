import actualCreate from 'zustand';
import { act } from 'react-dom/test-utils';

/**
 * This mock adds functionality to standard zustand by resetting to the
 * initial state after each test.
 */

// eslint-disable-next-line @typescript-eslint/ban-types
const stores = new Set<Function>();

const create: typeof actualCreate = (createState: any) => {
  const store = actualCreate(createState);
  const initialState = store.getState();
  stores.add(() => act(() => store.setState(initialState, true)));

  return store;
};

afterEach(() => {
  stores.forEach(resetFn => resetFn());
});

export default create;
