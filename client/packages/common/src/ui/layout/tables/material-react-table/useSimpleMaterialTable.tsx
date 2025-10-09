import React from 'react';
import { MRT_RowData, MRT_ShowHideColumnsButton } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { Box } from '@mui/material';

interface SimpleTableConfig<T extends MRT_RowData> extends BaseTableConfig<T> {
  bottomToolbarContent?: string | React.JSX.Element | React.JSX.Element[];
}

export const useSimpleMaterialTable = <T extends MRT_RowData>({
  bottomToolbarContent,
  ...tableOptions
}: SimpleTableConfig<T>) => {
  const {
    getIsPlaceholderRow = () => false,
    getIsRestrictedRow = () => false,
  } = tableOptions;

  const table = useBaseMaterialTable<T>({
    enableRowSelection: false,
    enableBottomToolbar: true,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableSorting: false,
    enableColumnResizing: false,
    state: {
      ...tableOptions.state,
      density: 'compact',
      // Disable all filtering/sorting for simple table
      columnFilters: [],
      sorting: [],
    },
    ...tableOptions,
    renderBottomToolbar: ({ table }) => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          '& .MuiTableCell-root': { border: 'none' },
        }}
      >
        <MRT_ShowHideColumnsButton table={table} />
        {bottomToolbarContent}
      </Box>
    ),

    muiTableHeadCellProps: {
      sx: {
        fontSize: '0.85em',
      },
    },
    muiTableBodyCellProps: ({ row }) => ({
      sx: {
        fontSize: '0.85em',
        fontWeight: 400,
        color: getIsPlaceholderRow(row.original)
          ? 'secondary.light'
          : getIsRestrictedRow(row.original)
            ? 'gray.main'
            : undefined,
        paddingY: '0.2rem',
      },
    }),
    muiTableBodyRowProps: {
      sx: { minHeight: '32px' },
    },
  });

  return table;
};
