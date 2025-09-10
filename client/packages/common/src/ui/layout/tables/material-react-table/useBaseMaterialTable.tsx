import React, { useMemo, useRef } from 'react';
import {
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
import {
  CheckboxCheckedIcon,
  CheckboxEmptyIcon,
  CheckboxIndeterminateIcon,
  InfoIcon,
} from '@common/icons';
import {
  getSavedTableState,
  // resetSavedTableState,
  useTableLocalStorage,
} from './useTableLocalStorage';
import { useIntlUtils } from '@common/intl';
import { isEqual } from '@common/utils';
import { ListItemIcon, MenuItem } from '@mui/material';
import { ColumnDef } from './types';
import { useMaterialTableColumns } from './useMaterialTableColumns';

export interface BaseTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  tableId: string; // key for local storage
  data: (T & { isSubRow?: boolean; subRows?: T[] })[];
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
  ...tableOptions
}: BaseTableConfig<T>) => {
  const initialState = useRef(getSavedTableState(tableId));

  const { getTableLocalisations } = useIntlUtils();
  const localization = getTableLocalisations();

  // tODO :clean up :)
  const { columns, defaultOrder } = useMaterialTableColumns(omsColumns);

  const hasNewColumns = columns.some(
    def =>
      !initialState.current.columnOrder.includes(
        def.id ?? (def.accessorKey as string)
      )
  );

  const processedData = useMemo(
    () => getGroupedRows(data, groupByField),
    [data, groupByField]
  );

  const table = useMaterialReactTable<T>({
    columns,

    localization,

    data: processedData,
    enablePagination: false,
    enableColumnResizing: true,
    enableColumnPinning: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection: true,
    enableFacetedValues: true,

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,
    enableExpanding: !!groupByField,

    initialState: {
      ...initialState.current,
      columnOrder: hasNewColumns
        ? defaultOrder
        : initialState.current.columnOrder,
    },
    state: {
      showProgressBars: isLoading,
      ...state,
    },

    renderColumnActionsMenuItems: ({ internalColumnMenuItems, column }) => {
      const { description } = column.columnDef as ColumnDef<T>; // MRT doesn't support typing custom column props, but we know it will be here

      if (!description) return internalColumnMenuItems;

      return [
        <MenuItem
          key="column-description"
          disabled // just for display, not clickable
          sx={{ '&.Mui-disabled': { opacity: 1 } }} // but remove the greyed out look
          divider
        >
          <ListItemIcon>
            <InfoIcon />
          </ListItemIcon>
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
        fontSize: table.getState().density === 'compact' ? '0.95em' : '1em',
        lineHeight: 1.2,
        verticalAlign: 'bottom',
        justifyContent: 'space-between',
        '& .Mui-TableHeadCell-Content svg': {
          fontSize: '2em',
          marginLeft: 0,
        },
        // Allow date range filters to wrap if column is too narrow
        '& .MuiCollapse-wrapperInner > div': {
          display: 'flex',
          flexWrap: 'wrap',
          // Date picker should never need to be wider than 170px
          '& .MuiPickersTextField-root': { width: '170px' },
        },
        button: {
          visibility: column.id === 'mrt-row-expand' ? 'hidden' : undefined,
        },
        '& input::placeholder': {
          fontSize:
            table.getState().density === 'compact' ? '0.90em' : '0.95em',
        },
      },
    }),
    muiTableBodyCellProps: ({ cell, row, table }) => ({
      sx: {
        fontSize: table.getState().density === 'compact' ? '0.95em' : '1em',
        fontWeight: 400,
        color: getIsPlaceholderRow(row.original)
          ? 'secondary.light'
          : getIsRestrictedRow(row.original)
            ? 'gray.main'
            : undefined,
        // The expand chevron is rotated incorrectly by default (in terms of
        // consistency with other Accordion/Expando UI elements in the app)
        button: {
          rotate: row.getIsExpanded() ? '180deg' : '-90deg',
        },
        // Hide the icon when there's nothing to expand
        '& button.Mui-disabled': {
          color:
            cell.column.id === 'mrt-row-expand' && !row.getCanExpand()
              ? 'transparent'
              : undefined,
        },
        padding:
          table.getState().density === 'spacious'
            ? '0.7rem'
            : table.getState().density === 'comfortable'
              ? '0.35rem'
              : undefined, // default for "compact",

        // Indent "sub-rows" when expanded
        paddingLeft:
          row.original?.['isSubRow'] && cell.column.id !== 'mrt-row-select'
            ? '2em'
            : table.getState().density === 'comfortable'
              ? '0.5rem'
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

const getGroupedRows = <T,>(data: T[], groupByField?: keyof T): T[] => {
  if (!groupByField) return data;

  // Group rows by groupByField
  const grouped = data.reduce(
    (acc, item) => {
      const key = item[groupByField] as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );

  // For each group, create a summary row and subRows, or just return the row if only one
  return Object.values(grouped)
    .map(groupRows => {
      if (groupRows.length === 1) {
        // Only one row in group, return as-is
        return groupRows[0];
      }
      // All rows in this group
      const subRows = groupRows.map(row => ({ ...row, isSubRow: true }));
      // Build the summary row
      const summary: Record<string, any> = {};
      const keys = Object.keys(groupRows[0] || {});
      for (const key of keys) {
        // Don't include subRows or isSubRow in summary
        if (key === 'subRows' || key === 'isSubRow') continue;
        const values = groupRows.map(row => row[key as keyof T]);
        const allEqual = values.every(v => isEqual(v, values[0]));
        summary[key] = allEqual ? values[0] : '[multiple]';
      }
      // Attach subRows
      summary['subRows'] = subRows;
      return summary as T & { subRows: (T & { isSubRow: true })[] };
    })
    .filter((row): row is T => row !== undefined);
};
