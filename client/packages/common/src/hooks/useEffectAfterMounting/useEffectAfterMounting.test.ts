import { useEffectAfterMounting } from './useEffectAfterMounting';
import { renderHook } from '@testing-library/react';

describe('useEffectAfterMounting', () => {
  it('does not call the provided callback during the initial mount and render', () => {
    const callback = jest.fn();

    renderHook(() => useEffectAfterMounting(callback));

    expect(callback).not.toBeCalled();
  });

  it('does get invoked on a re-render', () => {
    const callback = jest.fn();

    const { rerender } = renderHook(() => useEffectAfterMounting(callback));

    rerender();

    expect(callback).toBeCalledTimes(1);
  });

  it('does not get invoked on a re-render if the dependencies have not changed', () => {
    const callback = jest.fn();

    const { rerender } = renderHook(() =>
      useEffectAfterMounting(callback, [callback])
    );

    rerender();

    expect(callback).not.toBeCalled();
  });

  it('does get invoked on a re-render if the dependencies have changed', () => {
    const callback = jest.fn();
    let value = 1;

    const { rerender } = renderHook(() =>
      useEffectAfterMounting(callback, [callback, value])
    );

    value = 2;
    rerender();

    expect(callback).toBeCalledTimes(1);
  });
});
