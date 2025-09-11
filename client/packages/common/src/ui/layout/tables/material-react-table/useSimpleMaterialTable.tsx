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
    muiTableBodyCellProps: {
      sx: {
        fontSize: '0.85em',
      },
    },
    muiTableBodyRowProps: {
      sx: {},
    },
  });

  return table;
};
