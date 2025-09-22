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
    enableBottomToolbar: !!bottomToolbarContent,
    enableTopToolbar: false,
    enableColumnActions: false,
    enableSorting: false,
    enableColumnResizing: false,
    enableColumnPinning: false,
    enableColumnOrdering: false,
    state: {
      ...tableOptions.state,
      density: 'compact',
    },
    layoutMode: 'grid-no-grow',
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
        color: getIsPlaceholderRow(row.original)
          ? 'secondary.light'
          : getIsRestrictedRow(row.original)
            ? 'gray.main'
            : undefined,
      },
    }),
    muiTableBodyRowProps: {
      sx: {},
    },
  });

  return table;
};
