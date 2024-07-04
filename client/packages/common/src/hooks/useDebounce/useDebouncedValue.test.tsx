import { useState } from 'react';
import { waitFor } from '@testing-library/dom';
import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  const useExample = (): [number, () => void] => {
    const [state, setState] = useState(0);
    const debounced = useDebouncedValue(state, 100);

    const increment = () => setState(state => (state += 1));

    return [debounced, increment];
  };

  it('only updates the value after the debounced time has expired', () => {
    const { result } = renderHook(useExample);

    act(() => {
      const { current } = result;
      const [, increment] = current;
      increment();
      increment();
    });

    waitFor(() => {
      expect(result.current[0]).toBe(1);
    });
  });
});
