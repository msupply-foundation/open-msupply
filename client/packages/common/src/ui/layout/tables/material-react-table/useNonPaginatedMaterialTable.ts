import { MRT_RowData } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  ...tableOptions
}: BaseTableConfig<T>) => {
  const table = useBaseMaterialTable<T>({
    isLoading,
    onRowClick,

    enableRowVirtualization: true,
    ...tableOptions,
  });

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);

  const resetRowSelection = () => {
    table.resetRowSelection();
  };
  return {
    table,
    selectedRows,
    resetRowSelection,
  };
};
