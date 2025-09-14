import { MRT_RowData } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  const table = useBaseMaterialTable<T>({
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
