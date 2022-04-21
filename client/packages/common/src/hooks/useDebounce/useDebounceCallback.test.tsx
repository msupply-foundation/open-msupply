import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useDebounceCallback } from './useDebounceCallback';

describe('useDebounceCallback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('returns a function which debounces consecutive calls', async () => {
    // Setting up a simple value for incrementing and a function which is a closure
    // over the value which will be incremented. The side effect makes this  somewhat flakey
    // when creating tests, but allows us to access the real state (i) to compare against
    // returned values from the callback to ensure they're the same.
    let i = 0;
    const func = () => {
      i = i + 1;
      return i;
    };

    const { result } = renderHook(() => {
      const cb = useDebounceCallback(func, [], 1000);

      return cb;
    });

    result.current();
    result.current();
    result.current();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(i).toBe(1);
  });

  it('calls the function again correctly after a wait period has completed', async () => {
    // Ensuring that after a wait period, we can just call the function again and the normal behaviour
    // is resumed.
    let i = 0;
    const func = () => {
      i = i + 1;
      return i;
    };

    const { result } = renderHook(() => {
      const cb = useDebounceCallback(func, [], 10);
      return cb;
    });

    result.current();
    result.current();
    result.current();

    act(() => {
      jest.advanceTimersByTime(10);
    });

    result.current();
    result.current();
    result.current();

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(i).toBe(2);
  });

  it('returns a function which resolves to the final value', async () => {
    let i = 0;
    const func = () => {
      i = i + 1;
      return i;
    };
    // Here we set up a debounced callback and call it multiple times and compare that the
    // resolved value from the last invocation aligns with with what the 'state' of i "should be".
    const { result } = renderHook(() => {
      const cb = useDebounceCallback(func, [], 10);

      return cb;
    });

    result.current();
    result.current();
    const val3 = result.current();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    return expect(val3).resolves.toBe(1);
  });

  it('is unaffected by re-renders', async () => {
    let i = 0;
    const func = () => {
      i = i + 1;
      return i;
    };
    // Since this is a hook, we want some render resilience, such that if a render occurs
    // in the middle of consecutive calls, the behaviour is stable and debouncing still
    // happens as per normal.
    const { result, rerender } = renderHook(() => {
      const cb = useDebounceCallback(func, []);
      return cb;
    });

    result.current();
    rerender();
    result.current();
    rerender();

    result.current();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(i).toBe(1);
  });

  it('creates a new debounced function whenever the deps list changes', async () => {
    let i = 0;
    const func = () => {
      i = i + 1;
      return i;
    };
    // We also have a dependency array where the desired behaviour would be that
    // whenever a dependency changes, a new debounced function is created. So
    // this test will re-render with a different dependency in the deps list, causing
    // a new debounced function to be created after each invocation, so consecutive calls should
    // NOT be debounced
    const { result, rerender } = renderHook(props => {
      const cb = useDebounceCallback(func, [props]);
      return cb;
    });

    result.current();
    rerender({});
    result.current();
    rerender({});

    result.current();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(i).toBe(3);
  });

  it('creates debounces normally if a dependency in the deps list has not changed', async () => {
    let i = 0;
    const func = () => {
      i = i + 1;
      return i;
    };
    // just making sure that if a dependency in the deps list doesn't actually change, we still keep our
    // stable debounce function, by passing a primitive to the deps list. Note that the initial props has
    // been set, and if removed, will mean a change from undefined -> !undefined
    const { result, rerender } = renderHook((props = 1) => {
      const cb = useDebounceCallback(func, [props]);
      return cb;
    });

    result.current();
    rerender(1);
    result.current();
    rerender(1);
    result.current();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(i).toBe(1);
  });
});
