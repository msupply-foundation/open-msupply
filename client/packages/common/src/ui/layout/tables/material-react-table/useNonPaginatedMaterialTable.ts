import { MRT_RowData, MRT_RowSelectionState } from 'material-react-table';
import {
  BaseMRTableConfig,
  useBaseMaterialTable,
} from './useBaseMaterialTable';
import { useMemo, useState } from 'react';

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  ...tableOptions
}: BaseMRTableConfig<T>) => {
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
