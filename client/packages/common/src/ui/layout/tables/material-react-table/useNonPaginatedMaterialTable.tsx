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

interface NonPaginatedTableConfig<T extends MRT_RowData>
  extends MRT_TableOptions<T> {
  onRowClick?: (row: T) => void;
  isLoading: boolean;
}

export const useBaseMaterialTable = <T extends MRT_RowData>({
  isLoading,
  onRowClick,
  ...tableOptions
}: NonPaginatedTableConfig<T>) => {
  const table = useMaterialReactTable<T>({
    enablePagination: false,
    enableRowVirtualization: true,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableColumnDragging: false,
    enableRowSelection: true,

    positionToolbarAlertBanner: 'bottom',

    initialState: {
      density: 'compact',
    },
    state: {
      showProgressBars: isLoading,
    },

    // Styling
    muiTablePaperProps: { sx: { width: '100%' } },
    muiTableHeadCellProps: {
      sx: {
        fontWeight: 600,
        lineHeight: 1.2,
        verticalAlign: 'bottom',
        '& svg': { fontSize: '2em', marginLeft: 0 },
      },
    },
    muiTableBodyCellProps: {
      sx: { fontSize: '14px', fontWeight: 400 },
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

// Export a renamed version for clarity
export const useNonPaginatedMaterialTable = useBaseMaterialTable;
