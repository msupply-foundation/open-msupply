import {
  MRT_RowData,
  MRT_RowSelectionState,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
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

  const table = useMaterialReactTable<T>({
    enablePagination: false,
    enableRowVirtualization: true,
    // muiTableBodyProps: {
    //   sx: { border: '1px solid blue', width: '100%' },
    // },
    enableColumnResizing: true,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    initialState: {
      density: 'compact',
    },
    state: {
      showProgressBars: isLoading,
      rowSelection,
    },
    muiTableHeadCellProps: {
      sx: {
        fontSize: '14px',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
      },
    },
    muiTableBodyCellProps: {
      sx: {
        fontSize: '14px',
        borderBottom: '1px solid rgba(224, 224, 224, 1)',
      },
    },
    muiTableBodyRowProps: ({ row, staticRowIndex }) => ({
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        backgroundColor: staticRowIndex % 2 === 0 ? 'transparent' : '#fafafb', // light grey on odd rows
        '& td': {
          borderBottom: '1px solid rgba(224, 224, 224, 1)',
        },
      },
    }),
    ...tableOptions,
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
