import { useWindowDimensions } from './useWindowDimensions';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';

const original = {
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
};

describe('useWindowDimensions', () => {
  beforeEach(() => {
    window.resizeTo(1000, 1000);
    jest.useFakeTimers();
  });

  afterAll(() => {
    window.resizeTo(original.innerWidth, original.innerHeight);
  });

  it('returns the current window dimensions', () => {
    const { result } = renderHook(useWindowDimensions);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toEqual({ width: 1000, height: 1000 });
  });

  it('triggers a state change on resize event', () => {
    const { result } = renderHook(useWindowDimensions);

    act(() => {
      window.resizeTo(500, 500);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.all.length).toEqual(2);
  });

  it('returns the new window dimensions after a resize event', () => {
    const { result } = renderHook(useWindowDimensions);

    act(() => {
      window.resizeTo(500, 500);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toEqual({ width: 500, height: 500 });
  });
});
