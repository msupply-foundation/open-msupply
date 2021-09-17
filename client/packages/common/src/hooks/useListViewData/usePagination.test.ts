import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';
import { usePagination } from './usePagination';

describe('usePagination', () => {
  it('first is correctly set to the initial value passed', () => {
    const { result } = renderHook(() => usePagination(10));

    expect(result.current.first).toEqual(10);
  });

  it('When the page has changed, the page, offset and first are correct', () => {
    const { result } = renderHook(() => usePagination(10));

    act(() => {
      result.current.onChangePage(3);
    });

    expect(result.current.offset).toEqual(30);
    expect(result.current.first).toEqual(10);
    expect(result.current.page).toEqual(3);
  });

  it('still has correct state after a series of page changes', () => {
    const { result } = renderHook(() => usePagination(10));

    act(() => {
      result.current.onChangePage(3);
      result.current.onChangePage(1);
      result.current.onChangePage(99);
      result.current.onChangePage(32);
      result.current.onChangePage(7);
    });

    expect(result.current.offset).toEqual(70);
    expect(result.current.first).toEqual(10);
    expect(result.current.page).toEqual(7);
  });
});
