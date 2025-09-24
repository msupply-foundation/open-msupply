import { MRT_RowData } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

const VIRTUALIZATION_THRESHOLD = 250;

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>({
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  // On initial load, "data" can be undefined, which causes the first render to
  // not use virtualization, which is really slow, so we default to true
  const shouldVirtualize = tableOptions?.data
    ? tableOptions?.data.length > VIRTUALIZATION_THRESHOLD
    : true;
  const table = useBaseMaterialTable<T>({
    enableRowVirtualization: shouldVirtualize,
    ...tableOptions,
  });

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);

  return {
    table,
    selectedRows,
  };
};
