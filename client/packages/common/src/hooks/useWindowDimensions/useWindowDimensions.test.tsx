import React, { useRef } from 'react';
import { useWindowDimensions } from './useWindowDimensions';
import { render, renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

const original = {
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  outerWidth: window.outerWidth,
  outerHeight: window.outerHeight,
};

const Component = () => {
  const renderCounter = useRef(0);
  renderCounter.current = renderCounter.current + 1;
  useWindowDimensions();

  return <span>{renderCounter.current}</span>;
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
    const { getByText } = render(<Component />);

    act(() => {
      window.resizeTo(500, 500);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const hasRenderedTwice = getByText(/2/);
    expect(hasRenderedTwice).toBeInTheDocument();
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
