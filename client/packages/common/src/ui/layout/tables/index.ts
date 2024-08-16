import { AppSxProp } from '@common/styles';
import { ViewportList } from 'react-viewport-list';
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
