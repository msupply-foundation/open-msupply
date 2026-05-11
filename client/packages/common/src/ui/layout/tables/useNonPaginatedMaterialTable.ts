import type { MRT_RowData, MRT_RowSelectionState } from './mrtCompat';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { useMemo, useState } from 'react';

interface NonPaginatedTableConfig<
  T extends MRT_RowData,
> extends BaseTableConfig<T> {}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  const table = useBaseMaterialTable<T>({
    enableVirtualization: true,
    manualSorting: false,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    ...tableOptions,
  });

  const selectedRows = useMemo(() => {
    return table
      .getRowModel()
      .flatRows.filter(row => !row.subRows?.length && row.getIsSelected())
      .map(row => row.original);
  }, [table.getState().rowSelection, table.getRowModel().flatRows]);

  return {
    table,
    selectedRows,
  };
};
