import { useWindowDimensions } from './useWindowDimensions';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';

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

describe('useWindowDimensions', () => {
  it('returns the current window dimensions', () => {
    const { result } = renderHook(useWindowDimensions);

    expect(result.current).toEqual({ width: 1000, height: 1000 });
  });

  it('triggers a state change on resize event', () => {
    const { result } = renderHook(useWindowDimensions);

    act(() => {
      window.resizeTo(500, 500);
    });

    expect(result.all.length).toEqual(2);
  });

  it('returns the new window dimensions after a resize event', () => {
    const { result } = renderHook(useWindowDimensions);

    act(() => {
      window.resizeTo(500, 500);
    });

    expect(result.current).toEqual({ width: 500, height: 500 });
  });
});
