import { MRT_RowData } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { useMaterialTableColumns } from './useMaterialTableColumns';

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  columns,
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  const { mrtColumnDefinitions } = useMaterialTableColumns(columns);
  const table = useBaseMaterialTable<T>({
    enableRowVirtualization: true,
    columns: mrtColumnDefinitions,
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
