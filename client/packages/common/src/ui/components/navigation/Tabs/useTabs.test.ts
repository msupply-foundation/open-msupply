import { act } from 'react';
import { useTabs } from './useTabs';
import { renderHook } from '@testing-library/react';

describe('useTabs', () => {
  it('returns an the correct initial tab', () => {
    const { result: result1 } = renderHook(() => useTabs('1'));
    expect(result1.current.currentTab).toBe('1');

    const { result: result2 } = renderHook(() => useTabs('2'));
    expect(result2.current.currentTab).toBe('2');
  });

  it('returns the correct tab once the tab has been changed', () => {
    const { result: result1 } = renderHook(() => useTabs('1'));

    // TODO: The synthetic event is a large type to create a fake version
    // of for it to just be ignored by the hook. Update this to a mock
    // event if we have the need to make them for something else.
    act(() => {
      result1.current.onChangeTab('3');
    });

    expect(result1.current.currentTab).toBe('3');

    const { result: result2 } = renderHook(() => useTabs('1'));

    act(() => {
      result2.current.onChangeTab('0');
    });

    expect(result2.current.currentTab).toBe('0');
  });
});
