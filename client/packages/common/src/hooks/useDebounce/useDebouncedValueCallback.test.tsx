import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useDebouncedValueCallback } from './useDebouncedValueCallback';

describe('useDebouncedValueCallback', () => {
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
      const cb = useDebouncedValueCallback(func, [], 1000);

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

  it('calls the function only once when re-rendered', async () => {
    let value = '';
    let deps = [''];

    const func = (str: string) => {
      value += str;
    };

    const { result, rerender } = renderHook(() => {
      const cb = useDebouncedValueCallback(func, deps, 10);
      return cb;
    });

    result.current('a');
    deps = ['a'];
    rerender();
    act(() => {
      jest.advanceTimersByTime(5);
    });

    result.current('b');
    deps = ['b'];
    rerender();

    act(() => {
      jest.advanceTimersByTime(5);
    });

    result.current('c');
    deps = ['c'];
    rerender();

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(value).toBe('c');
  });
});
