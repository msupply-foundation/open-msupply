import {
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';

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
  const table = useMaterialReactTable<T>({
    enablePagination: false,
    enableRowVirtualization: true,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableRowSelection: true,

    initialState: {
      density: 'compact',
    },
    state: {
      showProgressBars: isLoading,
    },

    // Styling
    muiTablePaperProps: { sx: { width: '100%' } },
    muiTableBodyProps: {
      sx: {
        // stripe the rows, make odd rows a darker color
        '& tr:nth-of-type(odd) > td': { backgroundColor: 'background.row' },
      },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 600,
        lineHeight: 1.2,
        verticalAlign: 'bottom',
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: '14px',
        fontWeight: 400,
      },
    },
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        '& td': { borderBottom: '1px solid rgba(224, 224, 224, 1)' },
      },
    }),
    ...tableOptions,
  });
  return table;
};
