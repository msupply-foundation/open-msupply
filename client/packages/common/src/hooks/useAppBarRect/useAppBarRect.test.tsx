/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { renderHook } from '@testing-library/react-hooks';
import { useAppBarRect, useAppBarRectStore } from '../../hooks/useAppBarRect';

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

describe('useAppBarRect', () => {
  // JSDom doesn't actually render things and has no layout engine to determine
  // actual dimensions.
  it('The state has some dimensions set after rendering the hook', () => {
    renderHook(useAppBarRect);

    const state = useAppBarRectStore.getState();
    const expected = {
      setAppBarRect: state.setAppBarRect,
      height: 0,
      width: 0,
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
      x: 0,
      y: 0,
    };

    expect(state).toEqual(expected);
  });

  it('Triggers a new state update when the window dimensions change', () => {
    const { result } = renderHook(useAppBarRect);

    expect(result.all.length).toBe(2);
  });
});
