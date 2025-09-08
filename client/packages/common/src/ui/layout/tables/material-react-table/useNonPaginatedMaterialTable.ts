import { MRT_RowData, MRT_TableOptions } from 'material-react-table';
import { useBaseMaterialTable } from './useBaseMaterialTable';

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
  const table = useBaseMaterialTable<T>({
    isLoading,
    onRowClick,

    enableRowVirtualization: true,

    ...tableOptions,
  });
  return table;
};
