import { renderHook } from '@testing-library/react';
import { setScreenSize_ONLY_FOR_TESTING, TestingProvider } from '../../utils';
import { useIsSmallScreen } from './useIsSmallScreen';

describe('useIsSmallScreen', () => {
  it('Returns true when the screen is less than 1024', () => {
    setScreenSize_ONLY_FOR_TESTING(1023);
    const { result } = renderHook(useIsSmallScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(true);
  });

  it('Returns true when the screen is 1024', () => {
    setScreenSize_ONLY_FOR_TESTING(1024);
    const { result } = renderHook(useIsSmallScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(true);
  });

  it('Returns false when the screen is greater than 1024', () => {
    setScreenSize_ONLY_FOR_TESTING(1025);

    const { result } = renderHook(useIsSmallScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(false);
  });
});
