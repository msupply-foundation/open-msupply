import { renderHook } from '@testing-library/react-hooks';
import { useRef } from 'react';
import { act } from 'react-dom/test-utils';
import { useBoundingClientRect } from './useBoundingClientRect';

const original = {
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
};

beforeEach(() => {
  window.resizeTo(1000, 1000);
});

afterAll(() => {
  window.resizeTo(original.innerWidth, original.innerHeight);
});

describe('useBoundingClientRect', () => {
  it('Returns a rect with dimensions', () => {
    // NOTE: JSDom doesn't have a layout engine so the actual rect is unfortunately
    // just zero'd out.
    const { result } = renderHook(() => {
      const ref = useRef(null);
      const rect = useBoundingClientRect(ref);

      return rect;
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      })
    );
  });

  it('Updates the state after a window resize event', () => {
    const { result } = renderHook(() => {
      const ref = useRef(null);
      const rect = useBoundingClientRect(ref);

      return rect;
    });

    act(() => {
      window.resizeTo(500, 500);
    });

    expect(result.all.length).toBe(2);
  });
});
