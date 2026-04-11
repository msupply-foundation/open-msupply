import { ViewportList, ViewportListRef } from 'react-viewport-list';
import {
  Table,
  TableBody,
  TableCell,
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

export {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ViewportList,
};
export type { TableCellProps, ViewportListRef };

export * from './aggregationFns';
export * from './usePaginatedMaterialTable';
export * from './useNonPaginatedMaterialTable';
export * from './useSimpleMaterialTable';
export * from './useMaterialTableColumns';
export * from './utils';
export * from './types';
export * from './useGetColumnDefDefaults';
export * from './components';

// Custom thin wrapper replacing material-react-table
export { DataTable as MaterialTable } from './DataTable';

// Re-export MRT compat types so consumer packages can import from @openmsupply-client/common
export type {
  MRT_RowData,
  MRT_Row,
  MRT_Cell,
  MRT_Column,
  MRT_TableInstance,
  MRT_ColumnDef,
  MRT_DensityState,
  MRT_ColumnOrderState,
  MRT_ColumnPinningState,
  MRT_ColumnSizingState,
  MRT_VisibilityState,
  MRT_ColumnFiltersState,
  MRT_SortingState,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_GroupingState,
  MRT_Updater,
} from './mrtCompat';
