import React from 'react';
import { MRT_RowData, MRT_TableOptions } from 'material-react-table';
import {
  CheckboxCheckedIcon,
  CheckboxEmptyIcon,
  CheckboxIndeterminateIcon,
} from '@common/icons';
import { MenuItem, Typography } from '@mui/material';
import { ColumnDef } from './types';
import { NothingHere } from '@common/components';

export const getTableDisplayOptions = <T extends MRT_RowData>(
  onRowClick?: (row: T) => void,
  getIsPlaceholderRow: (row: T) => boolean = () => false,
  getIsRestrictedRow: (row: T) => boolean = () => false
): Partial<MRT_TableOptions<T>> => ({
  // Add column description to column menu
  renderColumnActionsMenuItems: ({ internalColumnMenuItems, column }) => {
    const { description, header } = column.columnDef as ColumnDef<T>; // MRT doesn't support typing custom column props, but we know it will be here

    return [
      <MenuItem
        key="column-description"
        disabled // just for display, not clickable
        sx={{
          '&.Mui-disabled': { opacity: 1 }, // but remove the greyed out look
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
        divider
      >
        <Typography fontWeight="bold">{header}</Typography>
        {description}
      </MenuItem>,

      ...internalColumnMenuItems,
    ];
  },

  renderEmptyRowsFallback: () => <NothingHere />,

  // Styling
  muiTablePaperProps: {
    sx: { width: '100%', display: 'flex', flexDirection: 'column' },
  },
  muiTableContainerProps: {
    sx: { flex: 1, display: 'flex', flexDirection: 'column' },
  },
  muiTableProps: {
    sx: theme => ({
      // Need to apply this here so that relative sizes (ems, %) within table are correct
      fontSize: theme.typography.body1.fontSize,
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
    }),
  },
  muiTableBodyProps: ({ table }) => ({
    // Make the NothingHere component vertically centered when there are no rows
    sx: { height: table.getRowCount() === 0 ? '100%' : 'auto' },
  }),

  muiTableHeadCellProps: ({ column, table }) => ({
    sx: {
      fontWeight: 600,
      fontSize: table.getState().density !== 'spacious' ? '0.9em' : '1em',
      lineHeight: 1.2,
      verticalAlign: 'bottom',
      justifyContent: 'space-between',
      '& .MuiTableSortLabel-root': {
        display: column.getIsSorted() ? undefined : 'none',
      },
      '& .Mui-TableHeadCell-Content-Actions': {
        '& svg': { fontSize: '2em' },
      },
      // Allow date range filters to wrap if column is too narrow
      '& .MuiCollapse-wrapperInner > div': {
        display: 'flex',
        flexWrap: 'wrap',
        // Date picker should never need to be wider than 170px
        '& .MuiPickersTextField-root': { width: '170px' },
      },
      button:
        column.id === 'mrt-row-expand'
          ? {
              rotate: table.getIsAllRowsExpanded()
                ? '180deg'
                : !table.getIsSomeRowsExpanded()
                  ? '-90deg'
                  : undefined,
            }
          : undefined,
      // For Filter inputs -- add additional classes for other filter types as
      // required
      '& .MuiInputBase-input, & .MuiPickersInputBase-root': {
        fontSize: table.getState().density === 'compact' ? '0.90em' : '0.95em',
      },
    },
  }),
  muiTableBodyCellProps: ({ cell, row, table }) => ({
    sx: {
      fontSize: table.getState().density === 'compact' ? '0.90em' : '1em',
      fontWeight: 400,
      color: getIsPlaceholderRow(row.original)
        ? 'secondary.light'
        : getIsRestrictedRow(row.original)
          ? 'gray.main'
          : undefined,

      ...(cell.column.id === 'mrt-row-expand' && {
        // The expand chevron is rotated incorrectly by default (in terms of
        // consistency with other Accordion/Expando UI elements in the app)
        button: {
          rotate: row.getIsExpanded() ? '180deg' : '-90deg',
        },
        // Hide the icon when there's nothing to expand
        '& button.Mui-disabled': {
          color: !row.getCanExpand() ? 'transparent' : undefined,
        },
      }),
      padding:
        table.getState().density === 'spacious'
          ? '0.7rem'
          : table.getState().density === 'comfortable'
            ? '0.35rem 0.5rem'
            : undefined, // default for "compact",

      // Indent "sub-rows" when expanded
      paddingLeft:
        row.original?.['isSubRow'] && cell.column.id !== 'mrt-row-select'
          ? '2em'
          : undefined,
    },
  }),

  muiTopToolbarProps: {
    sx: { height: '60px' }, // Prevent slight jump when selecting rows
  },

  muiSelectAllCheckboxProps: {
    color: 'outline',
    size: 'small',
    icon: <CheckboxEmptyIcon />,
    checkedIcon: <CheckboxCheckedIcon />,
    indeterminateIcon: <CheckboxIndeterminateIcon />,
  },
  muiSelectCheckboxProps: {
    color: 'outline',
    size: 'small',
    icon: <CheckboxEmptyIcon />,
    checkedIcon: <CheckboxCheckedIcon />,
    indeterminateIcon: <CheckboxIndeterminateIcon />,
  },
  muiToolbarAlertBannerProps: {
    sx: { backgroundColor: 'unset' },
  },
  muiTableBodyRowProps: ({ row }) => {
    return {
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        '& td': { borderBottom: '1px solid rgba(224, 224, 224, 1)' },
        backgroundColor: row.original['isSubRow']
          ? 'background.secondary'
          : 'inherit',
        fontStyle: row.getCanExpand() ? 'italic' : 'normal',
        cursor: onRowClick ? 'pointer' : 'default',
      },
    };
  },
  // TO-DO: Add a "reset all" button
  // renderToolbarInternalActions: ({ table }) => {
  //   return (
  //     <>
  //       <button
  //         onClick={() => {
  //           console.log('Custom action clicked');
  //           resetSavedTableState(tableId);
  //           table.resetColumnOrder();
  //         }}
  //       >
  //         Custom Action
  //       </button>
  //       <MRT_ShowHideColumnsButton table={table} />
  //       <MRT_ToggleFullScreenButton table={table} />{' '}
  //     </>
  //   );
  // },
});
