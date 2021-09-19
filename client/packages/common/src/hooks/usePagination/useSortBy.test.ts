import { useSortBy } from './useSortBy';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';

interface TestSortBy {
  id: string;
  quantity: number;
}

describe('useSortBy', () => {
  it('Has the correct initial value', () => {
    const { result } = renderHook(() =>
      useSortBy<TestSortBy>({ key: 'id', isDesc: false })
    );

    expect(result.current.sortBy).toEqual({
      key: 'id',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by', () => {
    const { result } = renderHook(() =>
      useSortBy<TestSortBy>({ key: 'id', isDesc: false })
    );

    act(() => {
      result.current.onChangeSortBy('quantity');
    });

    expect(result.current.sortBy).toEqual({
      key: 'quantity',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by for the same column that is set', () => {
    const { result } = renderHook(() =>
      useSortBy<TestSortBy>({ key: 'id', isDesc: false })
    );

    act(() => {
      result.current.onChangeSortBy('id');
    });

    expect(result.current.sortBy).toEqual({
      key: 'id',
      isDesc: true,
      direction: 'desc',
    });
  });

  it('has the correct values after triggering a few sort bys in sequence', () => {
    const { result } = renderHook(() =>
      useSortBy<TestSortBy>({ key: 'id', isDesc: false })
    );

    act(() => {
      // initially: id/asc
      result.current.onChangeSortBy('id');
      // should be: id/desc
      result.current.onChangeSortBy('id');
      // should be: quantity/asc
      result.current.onChangeSortBy('quantity');
      // should be: id/asc
      result.current.onChangeSortBy('id');
      // should be: quantity/asc
      result.current.onChangeSortBy('quantity');
      // should be: quantity/desc
      result.current.onChangeSortBy('quantity');
    });

    expect(result.current.sortBy).toEqual({
      key: 'quantity',
      isDesc: true,
      direction: 'desc',
    });
  });
});
