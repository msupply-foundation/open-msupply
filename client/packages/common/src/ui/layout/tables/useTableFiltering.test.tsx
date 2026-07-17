import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { act, renderHook } from '@testing-library/react';
import { TestingProvider } from '@common/utils/testing';
import { ColumnDef } from './types';
import { useTableFiltering } from './useTableFiltering';

const getWrapper =
  (initialEntries: string[] = ['/testing']) =>
    ({ children }: { children: ReactNode }) => (
      <TestingProvider>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </TestingProvider>
    );

const columns = [
  { id: 'status', filterVariant: 'multi-select' },
  { accessorKey: 'otherPartyName' },
] as ColumnDef<Record<string, unknown>>[];

describe('useTableFiltering', () => {
  describe('getFilterState (URL -> MRT column filter state)', () => {
    it('splits a comma-separated multi-select value into an array', () => {
      const { result } = renderHook(() => useTableFiltering(columns, false), {
        wrapper: getWrapper(['/testing?status=NEW,ALLOCATED']),
      });

      expect(result.current.columnFilters).toEqual([
        { id: 'status', value: ['NEW', 'ALLOCATED'] },
      ]);
    });

    it('wraps a single multi-select value in an array', () => {
      const { result } = renderHook(() => useTableFiltering(columns, false), {
        wrapper: getWrapper(['/testing?status=NEW']),
      });

      expect(result.current.columnFilters).toEqual([
        { id: 'status', value: ['NEW'] },
      ]);
    });

    it('matches a column by accessorKey (no filterKey) and leaves text values untouched', () => {
      const { result } = renderHook(() => useTableFiltering(columns, false), {
        wrapper: getWrapper(['/testing?otherPartyName=acme']),
      });

      expect(result.current.columnFilters).toEqual([
        { id: 'otherPartyName', value: 'acme' },
      ]);
    });

    it('ignores sort/dir/tab params', () => {
      const { result } = renderHook(() => useTableFiltering(columns, false), {
        wrapper: getWrapper(['/testing?sort=status&dir=asc&tab=foo']),
      });

      expect(result.current.columnFilters).toEqual([]);
    });
  });

  describe('onColumnFiltersChange (MRT column filter state -> URL)', () => {
    it('serialises a multi-select array to a comma-separated value', () => {
      const { result } = renderHook(() => useTableFiltering(columns, false), {
        wrapper: getWrapper(['/testing']),
      });

      act(() => {
        result.current.onColumnFiltersChange(() => [
          { id: 'status', value: ['NEW', 'PICKED'] },
        ]);
      });

      expect(result.current.columnFilters).toEqual([
        { id: 'status', value: ['NEW', 'PICKED'] },
      ]);
    });

    it('removes the filter when the multi-select is cleared', () => {
      const { result } = renderHook(() => useTableFiltering(columns, false), {
        wrapper: getWrapper(['/testing?status=NEW,PICKED']),
      });

      act(() => {
        result.current.onColumnFiltersChange(() => []);
      });

      expect(result.current.columnFilters).toEqual([]);
    });
  });
});
