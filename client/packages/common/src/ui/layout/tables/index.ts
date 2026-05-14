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
  TableCellProps,
  TableContainer,
  TableHead,
  TableRow,
  ViewportList,
  ViewportListRef,
};

export * from './aggregationFns';
export * from './usePaginatedMaterialTable';
export * from './useNonPaginatedMaterialTable';
export * from './useSimpleMaterialTable';
export * from './useMaterialTableColumns';
export * from './utils';
export * from './types';
export * from './useGetColumnDefDefaults';
export * from './components';
// Re-exporting so all imports come from common folder.
// React Compiler / MRT compatibility: the table instance returned by
// useBaseMaterialTable is a Proxy with a fresh identity each render, so
// compiled callers can't cache <MaterialTable table={...} /> JSX. See
// useBaseMaterialTable.tsx → useReactiveTableInstance.
export { MaterialReactTable as MaterialTable } from 'material-react-table';
