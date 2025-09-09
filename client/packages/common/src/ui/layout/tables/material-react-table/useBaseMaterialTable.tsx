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
  InfoIcon,
} from '@common/icons';
import { useIntlUtils } from '@common/intl';
import { ListItemIcon, MenuItem } from '@mui/material';
import { ColumnDef } from './types';

export interface BaseTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  onRowClick?: (row: T) => void;
  isLoading: boolean;
  getIsPlaceholderRow?: (row: T) => boolean;
  /** Whether row should be greyed out - still potentially clickable */
  getIsRestrictedRow?: (row: T) => boolean;
  columns: ColumnDef<T>[];
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  state,
  isLoading,
  onRowClick,
  getIsPlaceholderRow = () => false,
  getIsRestrictedRow = () => false,
  ...tableOptions
}: BaseTableConfig<T>) => {
  const { getTableLocalisations } = useIntlUtils();
  const localization = getTableLocalisations();

  const table = useMaterialReactTable<T>({
    localization,

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
        color: getIsPlaceholderRow(row.original)
          ? 'secondary.light'
          : getIsRestrictedRow(row.original)
            ? 'gray.main'
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
