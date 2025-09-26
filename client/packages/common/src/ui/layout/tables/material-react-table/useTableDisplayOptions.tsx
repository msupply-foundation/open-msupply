import React from 'react';
import {
  MRT_RowData,
  MRT_ShowHideColumnsButton,
  MRT_TableOptions,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleFullScreenButton,
} from 'material-react-table';
import {
  CheckboxCheckedIcon,
  CheckboxEmptyIcon,
  CheckboxIndeterminateIcon,
  RefreshIcon,
} from '@common/icons';
import { MenuItem, Typography } from '@mui/material';
import { ColumnDef } from './types';
import { IconButton } from '@common/components';
import { useTranslation } from '@common/intl';
import { hasSavedState } from './tableState/utils';

export const useTableDisplayOptions = <T extends MRT_RowData>(
  tableId: string,
  resetTableState: () => void,
  onRowClick?: (row: T) => void,
  getIsPlaceholderRow: (row: T) => boolean = () => false,
  getIsRestrictedRow: (row: T) => boolean = () => false
): Partial<MRT_TableOptions<T>> => {
  const t = useTranslation();
  return {
    // Add description to column menu
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

    // Add reset state button to toolbar
    renderToolbarInternalActions: ({ table }) => (
      <>
        <MRT_ToggleFiltersButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
        <IconButton
          icon={<RefreshIcon />}
          onClick={resetTableState}
          label={t('label.reset-table-defaults')}
          disabled={!hasSavedState(tableId)}
          sx={{
            width: '40px',
            height: '40px',
            '& svg': { fontSize: '1.2rem' },
          }}
        />
        <MRT_ToggleFullScreenButton table={table} />
      </>
    ),

    // Styling
    muiTablePaperProps: {
      sx: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        // Reduce the height and padding of the Actions toolbar
        '& > .MuiBox-root': {
          minHeight: '2.5rem',
          height: 'unset',
        },
        '& > .MuiBox-root > .MuiBox-root': {
          paddingY: 0,
        },
      },
    },
    muiTableContainerProps: {
      sx: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      },
    },
    muiTableProps: ({ table }) => ({
      // Need to apply this here so that relative sizes (ems, %) within table
      // are correct
      sx: theme => ({
        // Need to apply this here so that relative sizes (ems, %) within table are correct
        fontSize: theme.typography.body1.fontSize,
        // Make the NothingHere component vertically centered when there are no
        // rows (in conjunction with muiTableBodyProps below)
        ...(table.getRowCount() === 0
          ? { display: 'flex', flex: 1, flexDirection: 'column' }
          : {}),
      }),
    }),

    muiTableHeadCellProps: ({ column, table }) => ({
      sx: {
        fontWeight: 600,
        fontSize: table.getState().density !== 'spacious' ? '0.9em' : '1em',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
        justifyContent: 'space-between',
        opacity: 1,
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
          fontSize:
            table.getState().density === 'compact' ? '0.90em' : '0.95em',
        },
      },
    }),

    muiTableBodyProps: ({ table }) =>
      // Make the NothingHere component vertically centered when there are no
      // rows
      table.getRowCount() === 0
        ? {
            sx: { height: '100%' },
          }
        : {},

    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        backgroundColor: row.original['isSubRow']
          ? 'background.secondary'
          : 'inherit',
        fontStyle: row.getCanExpand() ? 'italic' : 'normal',
        cursor: onRowClick ? 'pointer' : 'default',
      },
    }),

    muiTableBodyCellProps: ({ row, column, table }) => ({
      sx: {
        fontSize: table.getState().density === 'compact' ? '0.90em' : '1em',
        fontWeight: 400,
        // Remove transparency from pinned backgrounds
        opacity: 1,
        color: getIsPlaceholderRow(row.original)
          ? 'secondary.light'
          : getIsRestrictedRow(row.original)
            ? 'gray.main'
            : undefined,

        ...(column.id === 'mrt-row-expand' && {
          // The expand chevron is rotated incorrectly by default (in terms of
          // consistency with other Accordion/Expando UI elements in the app)
          button: {
            rotate: row.getIsExpanded() ? '180deg' : '-90deg',
            // Height and padding affect the density of the row
            padding: 0,
            height: 'unset',
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
          row.original?.['isSubRow'] && column.id !== 'mrt-row-select'
            ? '2em'
            : undefined,
        backgroundColor:
          column.getIsPinned() || row.getIsSelected()
            ? // Remove transparency from pinned backgrounds
              'rgba(252, 252, 252, 1)'
            : undefined,

        ...((column.columnDef as ColumnDef<T>).getIsError?.(row.original)
          ? {
              border: '2px solid',
              borderColor: 'error.main',
              borderRadius: '8px',
            }
          : {
              borderBottom: '1px solid rgba(224, 224, 224, 1)',
            }),
      },
    }),

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
    displayColumnDefOptions: {
      'mrt-row-select': {
        size: 50,
        muiTableHeadCellProps: {
          align: 'center',
        },
        muiTableBodyCellProps: {
          align: 'center',
        },
      },
    },
  };
};
