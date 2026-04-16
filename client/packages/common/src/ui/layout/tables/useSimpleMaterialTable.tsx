import type { ReactNode } from 'react';
import type { MRT_RowData } from './mrtCompat';
import type { Row } from '@tanstack/react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

interface SimpleTableConfig<T extends MRT_RowData> extends Omit<BaseTableConfig<T>, 'enableBottomToolbar'> {
  bottomToolbarContent?: ReactNode;
}

export const useSimpleMaterialTable = <T extends MRT_RowData>({
  bottomToolbarContent,
  ...tableOptions
}: SimpleTableConfig<T>) => {
  const {
    getIsPlaceholderRow = () => false,
    getIsRestrictedRow = () => false,
  } = tableOptions;

  const table = useBaseMaterialTable<T>({
    enableRowSelection: false,
    enableBottomToolbar: true,
    enableTopToolbar: false,
    enableSorting: false,
    enableColumnResizing: false,
    bottomToolbarContent,
    state: {
      ...tableOptions.state,
      columnFilters: [],
      sorting: [],
    },
    ...tableOptions,
    getIsPlaceholderRow: getIsPlaceholderRow as (row: Row<T>) => boolean,
    getIsRestrictedRow: getIsRestrictedRow as (row: Row<T>) => boolean,
  });

  return table;
};
