import React, { useState } from 'react';
import { fireEvent, render, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { act } from 'react-dom/test-utils';
import { useBoundingClientRect } from './useBoundingClientRect';

describe('useBoundingClientRect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('Returns a rect with dimensions', () => {
    // NOTE: JSDom doesn't have a layout engine so the actual rect is unfortunately
    // just zero'd out.
    const { result } = renderHook(() => {
      const ref = useRef(null);
      const rect = useBoundingClientRect(ref);

      return rect;
    });

    act(() => {
      jest.advanceTimersByTime(1000);
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

  it('Updates the state after a window resize event', async () => {
    const X = () => {
      const [width, setWidth] = useState(100);
      const ref = useRef(null);
      useBoundingClientRect(ref);

      const count = useRef(0);
      count.current += 1;

      return (
        <div style={{ width }} ref={ref}>
          <button onClick={() => setWidth(300)} />
          <span>{count.current}</span>
        </div>
      );
    };

    const { getByText, getByRole, findByText } = render(<X />);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should have rendered twice - once for a standard render, another to set the rect.
    const hasRenderedTwice = getByText(/2/);

    // Find the button and click it to trigger a resize
    const button = getByRole('button');
    fireEvent.click(button);
    const hasRenderedThrice = await findByText(/3/);

    expect(hasRenderedTwice).toBeInTheDocument();
    expect(hasRenderedThrice).toBeInTheDocument();
  });
});
