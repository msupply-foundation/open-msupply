import { renderHook } from '@testing-library/react';
import { useIsMountedRef } from '.';

describe('useIsMountedRef', () => {
  it('is set to true once a component has mounted', () => {
    const { result } = renderHook(useIsMountedRef);

    expect(result.current.current).toBe(true);
  });

  it('is set to false once a component has unmounted', () => {
    const { result, unmount } = renderHook(useIsMountedRef);

    unmount();

    expect(result.current.current).toBe(false);
  });
});
