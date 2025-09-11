import React, { useMemo, useRef, useState } from 'react';
import {
  getDefaultColumnOrderIds,
  MRT_RowData,
  MRT_StatefulTableOptions,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
import {
  CheckboxCheckedIcon,
  CheckboxEmptyIcon,
  CheckboxIndeterminateIcon,
} from '@common/icons';
import {
  getSavedTableState,
  // resetSavedTableState,
  useTableLocalStorage,
} from './useTableLocalStorage';
import { useIntlUtils, useTranslation } from '@common/intl';
import { MenuItem, Typography } from '@mui/material';
import { ColumnDef } from './types';
import { useMaterialTableColumns } from './useMaterialTableColumns';
import { getGroupedRows } from './utils';

export interface BaseTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  tableId: string; // key for local storage
  onRowClick?: (row: T) => void;
  isLoading: boolean;
  getIsPlaceholderRow?: (row: T) => boolean;
  /** Whether row should be greyed out - still potentially clickable */
  getIsRestrictedRow?: (row: T) => boolean;
  groupByField?: string;
  columns: ColumnDef<T>[];
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  tableId,
  state,
  isLoading,
  onRowClick,
  getIsPlaceholderRow = () => false,
  getIsRestrictedRow = () => false,
  columns: omsColumns,
  data,
  groupByField,
  enableRowSelection = true,
  enableColumnResizing = true,
  ...tableOptions
}: BaseTableConfig<T>) => {
  const t = useTranslation();
  const { getTableLocalisations } = useIntlUtils();
  const localization = getTableLocalisations();

  const { columns, defaultHiddenColumns, defaultColumnPinning } =
    useMaterialTableColumns(omsColumns);

  const initialState = useRef(
    getSavedTableState<T>(tableId, defaultHiddenColumns, defaultColumnPinning)
  );
  const [columnOrder, setColumnOrder] = useState(
    initialState.current.columnOrder ?? []
  );

  const processedData = useMemo(
    () => getGroupedRows(data, groupByField, t),
    [data, groupByField]
  );

  const table = useMaterialReactTable<T>({
    columns,

    localization,

    data: processedData,
    enablePagination: false,
    enableColumnResizing,
    enableColumnPinning: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection,
    enableFacetedValues: true,

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,
    enableExpanding: !!groupByField,

    initialState: {
      ...initialState.current,

      columnOrder: getDefaultColumnOrderIds({
        columns,
        state: {},
        enableRowSelection, // adds `mrt-row-select`
        layoutMode: enableColumnResizing ? 'grid-no-grow' : 'auto', // adds `mrt-row-spacer`
      } as MRT_StatefulTableOptions<T>),
    },
    state: {
      showProgressBars: isLoading,
      columnOrder,
      ...state,
    },
    onColumnOrderChange: setColumnOrder,

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

    // Styling
    muiTablePaperProps: {
      sx: { width: '100%', display: 'flex', flexDirection: 'column' },
    },
    muiTableProps: {
      // Need to apply this here so that relative sizes (ems, %) within table
      // are correct
      sx: theme => ({ fontSize: theme.typography.body1.fontSize }),
    },
    muiTableHeadCellProps: ({ column, table }) => ({
      sx: {
        fontWeight: 600,
        fontSize: table.getState().density === 'compact' ? '0.90em' : '1em',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
        justifyContent: 'space-between',
        '& .Mui-TableHeadCell-Content-Actions': {
          marginRight: '5px',
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

    ...tableOptions,
  });

  useTableLocalStorage(tableId, table);

  return table;
};
