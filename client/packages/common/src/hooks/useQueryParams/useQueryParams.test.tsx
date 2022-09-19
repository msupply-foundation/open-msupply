import React, { FC, PropsWithChildren, ReactNode } from 'react';
import {
  createColumnWithDefaults,
  TestingRouterContext,
} from '@openmsupply-client/common';
import { TestingProvider } from '../../utils/testing';
import { useTheme } from '@common/styles';
import { act, renderHook } from '@testing-library/react';
import { useQueryParamsStore } from './useQueryParamsStore';

type TestSortBy = {
  id: string;
  quantity: number;
};

type ThemeChangererProps = {
  paginationRowHeight: number;
  dataRowHeight: number;
  headerRowHeight: number;
  footerHeight: number;
  saveButtonRowHeight: number;
};

const ThemeChangerer: FC<PropsWithChildren<ThemeChangererProps>> = ({
  children,
  paginationRowHeight,
  dataRowHeight,
  headerRowHeight,
  footerHeight,
  saveButtonRowHeight,
}) => {
  const theme = useTheme();
  theme.mixins.table.dataRow = { height: dataRowHeight };
  theme.mixins.table.paginationRow = { height: paginationRowHeight };
  theme.mixins.table.headerRow = { height: headerRowHeight };
  theme.mixins.footer = { height: footerHeight };
  theme.mixins.saveButtonRow = { height: saveButtonRowHeight };

  return <>{children}</>;
};

const getWrapper =
  (
    dataRowHeight = 10,
    headerRowHeight = 0,
    paginationRowHeight = 0,
    footerHeight = 0,
    saveButtonRowHeight = 0
  ) =>
  ({ children }: { children: ReactNode }) => {
    return (
      <TestingProvider>
        <TestingRouterContext>
          <ThemeChangerer
            paginationRowHeight={paginationRowHeight}
            dataRowHeight={dataRowHeight}
            headerRowHeight={headerRowHeight}
            footerHeight={footerHeight}
            saveButtonRowHeight={saveButtonRowHeight}
          >
            {children}
          </ThemeChangerer>
        </TestingRouterContext>
      </TestingProvider>
    );
  };

describe('useQueryParamsStore', () => {
  it('Returns the correct initial state', () => {
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });

    expect(result.current).toEqual(
      expect.objectContaining({
        sort: expect.objectContaining({
          sortBy: { key: 'id', isDesc: false, direction: 'asc' },
        }),
        pagination: expect.objectContaining({ page: 0, offset: 0, first: 20 }),
        filter: expect.objectContaining({
          filterBy: {
            comment: { equalTo: 'a' },
            allocatedDatetime: { equalTo: '1/1/2020' },
          },
        }),
      })
    );
  });
});

describe('filter', () => {
  it('updates date filter values', () => {
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    const now = new Date();
    act(() => {
      result.current.filter.onChangeDateFilterRule(
        'allocatedDatetime',
        'beforeOrEqualTo',
        now
      );
    });
    expect(
      result.current.filter.filterBy?.['allocatedDatetime']?.beforeOrEqualTo
    ).toEqual(now);
  });

  it('updates date filters', () => {
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    const now = new Date();
    act(() => {
      result.current.filter.onChangeDateFilterRule(
        'allocatedDatetime',
        'beforeOrEqualTo',
        now
      );
    });
    expect(result.current.filter.filterBy).toEqual({
      comment: { equalTo: 'a' },
      allocatedDatetime: { beforeOrEqualTo: now },
    });
  });

  it('updates string filter values', () => {
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    act(() => {
      result.current.filter.onChangeStringFilterRule(
        'comment',
        'equalTo',
        'josh'
      );
    });
    expect(result.current.filter.filterBy?.['comment']?.equalTo).toEqual(
      'josh'
    );
  });

  it('updates string filters', () => {
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    act(() => {
      result.current.filter.onChangeStringFilterRule('comment', 'like', 'josh');
    });
    expect(result.current.filter.filterBy).toEqual({
      comment: { like: 'josh' },
      allocatedDatetime: { equalTo: '1/1/2020' },
    });
  });

  it('clears string filters', () => {
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    act(() => {
      result.current.filter.onClearFilterRule('comment');
    });
    expect(result.current.filter.filterBy).toEqual({
      allocatedDatetime: { equalTo: '1/1/2020' },
    });
  });
});

describe('sort', () => {
  it('has the correct values after triggering a sort by', () => {
    const quantityColumn = createColumnWithDefaults<TestSortBy>({
      key: 'quantity',
    });
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    act(() => {
      result.current.sort.onChangeSortBy(quantityColumn);
    });
    expect(result.current.sort.sortBy).toEqual({
      key: 'quantity',
      isDesc: false,
      direction: 'asc',
    });
  });

  it('has the correct values after triggering a sort by for the same column that is set', () => {
    const idColumn = createColumnWithDefaults<TestSortBy>({ key: 'id' });
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    act(() => {
      result.current.sort.onChangeSortBy(idColumn);
    });
    expect(result.current.sort.sortBy).toEqual({
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
    const { result } = renderHook(() => useQueryParamsStore(), {
      wrapper: getWrapper(),
    });
    act(() => {
      // initially: id/asc
      result.current.sort.onChangeSortBy(idColumn);
      // should be: id/desc
      result.current.sort.onChangeSortBy(idColumn);
      // should be: quantity/asc
      result.current.sort.onChangeSortBy(quantityColumn);
      // should be: id/asc
      result.current.sort.onChangeSortBy(idColumn);
      // should be: quantity/asc
      result.current.sort.onChangeSortBy(quantityColumn);
      // should be: quantity/desc
      result.current.sort.onChangeSortBy(quantityColumn);
    });
    expect(result.current.sort.sortBy).toEqual({
      key: 'quantity',
      isDesc: true,
      direction: 'desc',
    });
  });

  describe('pagination', () => {
    it('has correct offset, first and page values When the page is changed', () => {
      const { result } = renderHook(() => useQueryParamsStore(), {
        wrapper: getWrapper(),
      });
      const { pagination } = result.current;
      act(() => {
        pagination.onChangePage(3);
      });
      expect(result.current.pagination.offset).toEqual(60);
      expect(result.current.pagination.first).toEqual(20);
      expect(result.current.pagination.page).toEqual(3);
    });

    it('still has correct state after a series of page changes', () => {
      const { result } = renderHook(() => useQueryParamsStore(), {
        wrapper: getWrapper(),
      });
      act(() => {
        result.current.pagination.onChangePage(3);
        result.current.pagination.onChangePage(1);
        result.current.pagination.onChangePage(99);
        result.current.pagination.onChangePage(32);
        result.current.pagination.onChangePage(7);
      });
      expect(result.current.pagination.offset).toEqual(140);
      expect(result.current.pagination.first).toEqual(20);
      expect(result.current.pagination.page).toEqual(7);
    });
  });
});
