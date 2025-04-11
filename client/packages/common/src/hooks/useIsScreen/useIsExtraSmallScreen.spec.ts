import { renderHook } from '@testing-library/react';
import { setScreenSize_ONLY_FOR_TESTING, TestingProvider } from '../../utils';
import { useIsExtraSmallScreen } from './useIsExtraSmallScreen';

describe('useIsExtraSmallScreen', () => {
  it('Returns true when the screen is less than 600', () => {
    setScreenSize_ONLY_FOR_TESTING(600);

    const { result } = renderHook(useIsExtraSmallScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(true);
  });

  it('Returns false when the screen is 601', () => {
    setScreenSize_ONLY_FOR_TESTING(601);

    const { result } = renderHook(useIsExtraSmallScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(false);
  });

  it('Returns false when the screen is greater than 640', () => {
    setScreenSize_ONLY_FOR_TESTING(602);

    const { result } = renderHook(useIsExtraSmallScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(false);
  });
});
