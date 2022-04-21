import { renderHook } from '@testing-library/react';
import { setScreenSize_ONLY_FOR_TESTING, TestingProvider } from '../../utils';
import { useIsExtraLargeScreen } from './useIsExtraLargeScreen';

describe('useIsExtraLargeScreen', () => {
  it('Returns true when the screen is greater than 1536', () => {
    setScreenSize_ONLY_FOR_TESTING(1537);

    const { result } = renderHook(useIsExtraLargeScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(true);
  });

  it('Returns false when the screen is 1536', () => {
    setScreenSize_ONLY_FOR_TESTING(1536);

    const { result } = renderHook(useIsExtraLargeScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(false);
  });

  it('Returns false when the screen is less than 1536', () => {
    setScreenSize_ONLY_FOR_TESTING(1535);

    const { result } = renderHook(useIsExtraLargeScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(false);
  });
});
