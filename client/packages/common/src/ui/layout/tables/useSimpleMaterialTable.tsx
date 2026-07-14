import React from 'react';
import { MRT_RowData, MRT_ShowHideColumnsButton } from 'material-react-table';
import { BaseTableConfig, useBaseMaterialTable } from './useBaseMaterialTable';
import { ColumnDef } from './types';
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
    bottomToolbar: ({ table, renderSettingsMenu }) => (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          '& .MuiTableCell-root': { border: 'none' },
        }}
      >
        <MRT_ShowHideColumnsButton table={table} />
        {/* Density is pinned to compact for simple tables, so hide the toggle */}
        {renderSettingsMenu({ showDensityToggle: false })}
        {bottomToolbarContent && (
          <Box sx={{ marginLeft: 'auto' }}>{bottomToolbarContent}</Box>
        )}
      </Box>
    ),

    muiTableHeadCellProps: {
      sx: {
        fontSize: '0.85em',
        '& .Mui-TableHeadCell-Content-Wrapper': {
          whiteSpace: 'normal',
        },
      },
    },
    muiTableBodyCellProps: ({ column, row }) => ({
      sx: {
        fontSize: '0.85em',
        fontWeight: 400,
        alignItems: 'flex-end',
        color: getIsPlaceholderRow(row)
          ? 'secondary.light'
          : getIsRestrictedRow(row)
            ? 'gray.main'
            : undefined,
        paddingY: '0.2rem',
        ...((column.columnDef as ColumnDef<T>).getIsError?.(row.original)
          ? {
            border: '2px solid',
            borderColor: 'error.main',
            borderRadius: '8px',
          }
          : {}),
      },
    }),
    muiTableBodyRowProps: {
      sx: { minHeight: '32px' },
    },
  });

  return table;
};
