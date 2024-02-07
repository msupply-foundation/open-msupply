import { renderHook } from '@testing-library/react';
import { useInterval } from './useInterval';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const mockSetInterval = () => {
  jest.useFakeTimers();
  jest.spyOn(window, 'setInterval');
};

const mockClearInterval = () => {
  jest.useFakeTimers();
  jest.spyOn(window, 'clearInterval');
};

describe('useInterval', () => {
  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(useInterval).toBeDefined();
  });

  it('should return undefined', () => {
    const { result } = renderHook(() => useInterval(() => {}, null));
    expect(result.current).toBeUndefined();
  });

  it('should fire the callback function (1)', async () => {
    const timeout = 500;
    const callback = jest.fn();
    renderHook(() => useInterval(callback, timeout));
    await sleep(timeout);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should fire the callback function (2)', async () => {
    const timeout = 500;
    const earlyTimeout = 400;
    const callback = jest.fn();
    renderHook(() => useInterval(callback, timeout));
    await sleep(earlyTimeout);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should call set interval on start', () => {
    const timeout = 1200;
    mockSetInterval();
    const callback = jest.fn();
    renderHook(() => useInterval(callback, timeout));
    expect(setInterval).toHaveBeenCalledTimes(1);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), timeout);
  });

  it('should call clearTimeout on unmount', () => {
    const timeout = 1200;
    mockClearInterval();
    const callback = jest.fn();
    const { unmount } = renderHook(() => useInterval(callback, timeout));
    unmount();
    expect(clearInterval).toHaveBeenCalledTimes(1);
  });
});
