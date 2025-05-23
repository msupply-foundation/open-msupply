import { AppSxProp } from '@common/styles';
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
export * from './hooks';
export * from './DataTable';
export * from './types';
export * from './columns';
export * from './utils';
export * from './context';
export * from './components';
export const DEFAULT_PAGE_SIZE = 25;

export const placeholderRowStyle: AppSxProp = {
  color: theme => theme.palette.secondary.light,
};

export const textStyles = {
  default: { fontSize: '14px', paddingLeft: '16px', paddingRight: 0 },
  dense: {
    fontSize: '12px',
    paddingLeft: '12px',
    paddingRight: '4px',
  },
};
