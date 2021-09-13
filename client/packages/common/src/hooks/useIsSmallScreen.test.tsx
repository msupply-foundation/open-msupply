import { renderHook } from '@testing-library/react-hooks';
import { setScreenSize_ONLY_FOR_TESTING } from '..';
import { useIsSmallScreen } from './useIsSmallScreen';

describe('useIsSmallScreen', () => {
  it('Returns false when the screen is greater than 1200', () => {
    // NOTE: jest-setup, by default sets all tests to have a screen size
    // of 1280
    const { result } = renderHook(useIsSmallScreen);
    const { current } = result;

    expect(current).toBe(false);
  });

  it('Returns true when the screen is less than 1200', () => {
    setScreenSize_ONLY_FOR_TESTING(1199);

    const { result } = renderHook(useIsSmallScreen);
    const { current } = result;

    expect(current).toBe(true);
  });
});
