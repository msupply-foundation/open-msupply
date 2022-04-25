import { createColumnWithDefaults } from './../../ui/layout/tables/hooks/useColumns/useColumns';
import { TestingRouterContext } from '@openmsupply-client/common';
import { useSortBy } from './useSortBy';
import { renderHook } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

interface TestSortBy {
  id: string;
  quantity: number;
}

describe('useSortBy', () => {
  it('Has the correct initial value', () => {
    const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
    const { result } = renderHook(() => useSortBy<TestSortBy>(idColumn), {
      wrapper: TestingRouterContext,
    });

    expect(result.current.sortBy).toEqual({
      key: 'id',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by', () => {
    const quantityColumn = createColumnWithDefaults<TestSortBy>({
      key: 'quantity',
    });
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }), {
      wrapper: TestingRouterContext,
    });

    act(() => {
      result.current.onChangeSortBy(quantityColumn);
    });

    expect(result.current.sortBy).toEqual({
      key: 'quantity',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by for the same column that is set', () => {
    const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }), {
      wrapper: TestingRouterContext,
    });

    act(() => {
      result.current.onChangeSortBy(idColumn);
    });

    expect(result.current.sortBy).toEqual({
      key: 'id',
      isDesc: true,
      direction: 'desc',
    });
  });

  it('has the correct values after triggering a few sort bys in sequence', () => {
    const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
    const quantityColumn = createColumnWithDefaults<TestSortBy>({
      key: 'quantity',
    });
    const { result } = renderHook(() => useSortBy<TestSortBy>({ key: 'id' }), {
      wrapper: TestingRouterContext,
    });

    act(() => {
      // initially: id/asc
      result.current.onChangeSortBy(idColumn);
      // should be: id/desc
      result.current.onChangeSortBy(idColumn);
      // should be: quantity/asc
      result.current.onChangeSortBy(quantityColumn);
      // should be: id/asc
      result.current.onChangeSortBy(idColumn);
      // should be: quantity/asc
      result.current.onChangeSortBy(quantityColumn);
      // should be: quantity/desc
      result.current.onChangeSortBy(quantityColumn);
    });

    expect(result.current.sortBy).toEqual({
      key: 'quantity',
      isDesc: true,
      direction: 'desc',
    });
  });
});
