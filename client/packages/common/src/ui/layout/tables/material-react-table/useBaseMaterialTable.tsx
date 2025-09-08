import * as React from 'react';
import {
  MRT_RowData,
  MRT_TableOptions,
  useMaterialReactTable,
} from 'material-react-table';
import {
  CheckboxCheckedIcon,
  CheckboxEmptyIcon,
  CheckboxIndeterminateIcon,
} from '@common/icons';
import { useTableLocalStorage } from './useTableLocalStorage';
import { useEffect } from 'react';

export interface BaseMRTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  tableId: string; // key for local storage
  onRowClick?: (row: T) => void;
  isLoading: boolean;
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  tableId,
  isLoading,
  onRowClick,
  state,
  ...tableOptions
}: BaseMRTableConfig<T>) => {
  const table = useMaterialReactTable<T>({
    enablePagination: false,
    enableColumnResizing: true,
    enableColumnPinning: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection: true,

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,

    // onColumnPinningChange: columnPinning => {
    //   console.log('Column pinning changed:', columnPinning());
    // },
    // onDensityChange: density => {
    //   console.log('Density changed:', density);
    //   updateTableState('density', density);
    // },
    // onColumnOrderChange: columns => {
    //   updateTableState('columnOrder', columns);
    //   console.log('Column order changed:', columns);
    // },
    // onColumnSizingChange: widths => {
    //   // updateTableState('columnWidths', widths);
    //   console.log('Column widths changed:', widths());
    // },
    // onColumnSizingInfoChange: info => {
    //   // updateTableState('columnSizingInfo', info);
    //   console.log('Column sizing info changed:', info);
    // },

    initialState: {
      density: 'compact',
      columnPinning: { left: ['mrt-row-select'] },
      ...tableOptions.initialState,
    },
    state: {
      showProgressBars: isLoading,
      ...state,
      // density: tableState.density,
      columnOrder:
        // tableState.columnOrder ??
        tableOptions.columns.map(c => c.id ?? c.accessorKey ?? ''),
    },

    // Styling
    muiTablePaperProps: {
      sx: { width: '100%', display: 'flex', flexDirection: 'column' },
    },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 600,
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
      },
    },
    muiTableBodyCellProps: {
      sx: { fontSize: '14px', fontWeight: 400 },
    },

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

    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        if (onRowClick) onRowClick(row.original);
      },
      sx: {
        '& td': { borderBottom: '1px solid rgba(224, 224, 224, 1)' },
      },
    }),

    ...tableOptions,
  });

  useTableLocalStorage(tableId, table);

  return table;
};
