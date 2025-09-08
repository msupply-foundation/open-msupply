import {
  MRT_RowData,
  MRT_RowSelectionState,
  MRT_TableOptions,
} from 'material-react-table';
import { useBaseMaterialTable } from './useBaseMaterialTable';
import { useMemo, useState } from 'react';

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  onRowClick?: (row: T) => void;
  isLoading: boolean;
}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});

  const table = useBaseMaterialTable<T>({
    isLoading,
    onRowClick,

    enableRowVirtualization: true,
    ...tableOptions,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  const selectedRows = useMemo(
    () => table.getSelectedRowModel().rows.map(r => r.original),
    [rowSelection]
  );

  const resetRowSelection = () => {
    table.resetRowSelection();
  };
  return { table, selectedRows, resetRowSelection };
};
