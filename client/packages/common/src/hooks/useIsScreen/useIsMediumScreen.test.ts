import { renderHook } from '@testing-library/react';
import { setScreenSize_ONLY_FOR_TESTING, TestingProvider } from '../../utils';
import { useIsMediumScreen } from './useIsMediumScreen';

describe('useIsMediumScreen', () => {
  it('Returns true when the screen is less than 1440', () => {
    setScreenSize_ONLY_FOR_TESTING(1339);
    const { result } = renderHook(useIsMediumScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(true);
  });

  it('Returns true when the screen is 1440', () => {
    setScreenSize_ONLY_FOR_TESTING(1440);
    const { result } = renderHook(useIsMediumScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(true);
  });

  it('Returns false when the screen is greater than 1440', () => {
    setScreenSize_ONLY_FOR_TESTING(1441);

    const { result } = renderHook(useIsMediumScreen, {
      wrapper: TestingProvider,
    });
    const { current } = result;

    expect(current).toBe(false);
  });
});
