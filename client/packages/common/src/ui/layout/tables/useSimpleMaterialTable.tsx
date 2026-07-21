import React from 'react';
import {
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableOptions,
} from 'material-react-table';
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

    // NOTE: these replace (not merge with) the base display options, so the
    // e2e `header-<columnId>` / `cell-<columnId>` testids must be re-applied.
    muiTableHeadCellProps: ({ column }) => ({
      'data-testid': `header-${column.id}`,
      sx: {
        fontSize: '0.85em',
        '& .Mui-TableHeadCell-Content-Wrapper': {
          whiteSpace: 'normal',
        },
      },
    }),
    muiTableBodyCellProps: ({ column, row }) => ({
      'data-testid': `cell-${column.id}`,
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
    // data-* attributes are forwarded by MUI but absent from TableRowProps.
    muiTableBodyRowProps: {
      'data-testid': 'table-row',
      sx: { minHeight: '32px' },
    } as MRT_TableOptions<T>['muiTableBodyRowProps'],
  });

  return table;
};
