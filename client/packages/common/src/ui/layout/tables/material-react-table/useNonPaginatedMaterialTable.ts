import { MRT_RowData } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends BaseTableConfig<T> {}

export const useNonPaginatedMaterialTable = <T extends MRT_RowData>(
  tableOptions: NonPaginatedTableConfig<T>
) => {
  const table = useBaseMaterialTable<T>({
    enableRowVirtualization: true,

    ...tableOptions,
  });
  return table;
};
