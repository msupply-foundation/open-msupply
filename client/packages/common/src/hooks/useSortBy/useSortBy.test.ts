import { ObjectWithStringKeys } from './../../types/utility';
import { useSortBy } from './useSortBy';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-dom/test-utils';

interface TestSortBy extends ObjectWithStringKeys {
  id: string;
  quantity: number;
}

describe('useSortBy', () => {
  it('Has the correct initial value', () => {
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }));

    expect(result.current.sortBy).toEqual({
      key: 'id',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by', () => {
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }));

    act(() => {
      result.current.onChangeSortBy({ key: 'quantity' });
    });

    expect(result.current.sortBy).toEqual({
      key: 'quantity',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by for the same column that is set', () => {
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }));

    act(() => {
      result.current.onChangeSortBy({ key: 'id' });
    });

    expect(result.current.sortBy).toEqual({
      key: 'id',
      isDesc: true,
      direction: 'desc',
    });
  });

  it('has the correct values after triggering a few sort bys in sequence', () => {
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }));

    act(() => {
      // initially: id/asc
      result.current.onChangeSortBy({ key: 'id' });
      // should be: id/desc
      result.current.onChangeSortBy({ key: 'id' });
      // should be: quantity/asc
      result.current.onChangeSortBy({ key: 'quantity' });
      // should be: id/asc
      result.current.onChangeSortBy({ key: 'id' });
      // should be: quantity/asc
      result.current.onChangeSortBy({ key: 'quantity' });
      // should be: quantity/desc
      result.current.onChangeSortBy({ key: 'quantity' });
    });

    expect(result.current.sortBy).toEqual({
      key: 'quantity',
      isDesc: true,
      direction: 'desc',
    });
  });
});
