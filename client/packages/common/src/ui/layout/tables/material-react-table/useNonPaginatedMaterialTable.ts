import { MRT_RowData } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { useMemo } from 'react';

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  const table = useBaseMaterialTable<T>({
    enableRowVirtualization: true,
    ...tableOptions,
  });

  const selectedRows = useMemo(() => {
    return table
      .getExpandedRowModel()
      .flatRows.filter(row => !row.subRows?.length && row.getIsSelected())
      .map(row => row.original);
  }, [table.getState().rowSelection, table.getExpandedRowModel().flatRows]);

  return {
    table,
    selectedRows,
  };
};
