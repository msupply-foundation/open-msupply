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

export interface BaseTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  onRowClick?: (row: T) => void;
  isLoading: boolean;
  getIsPlaceholder?: (row: T) => boolean;
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  getIsPlaceholder = () => false,
  ...tableOptions
}: BaseTableConfig<T>) => {
  const table = useMaterialReactTable<T>({
    enablePagination: false,
    enableColumnResizing: true,
    enableColumnPinning: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection: true,

    // Disable bottom footer - use OMS custom action footer instead
    enableBottomToolbar: false,

    initialState: {
      density: 'compact',
      columnPinning: { left: ['mrt-row-select'] },
      ...tableOptions.initialState,
    },
    state: {
      showProgressBars: isLoading,
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
    muiTableBodyCellProps: ({ row }) => ({
      sx: {
        fontSize: '14px',
        fontWeight: 400,
        color: getIsPlaceholder(row.original) ? 'secondary.light' : undefined,
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
  return table;
};
