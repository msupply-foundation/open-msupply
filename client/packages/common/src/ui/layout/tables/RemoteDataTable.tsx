/* eslint-disable react/jsx-key */
import React, { ReactNode, useEffect, useState } from 'react';

import {
  Column,
  ColumnInstance,
  Row,
  SortingRule,
  usePagination,
  useSortBy,
  useTable,
} from 'react-table';
import clsx from 'clsx';

import {
  Box,
  CircularProgress,
  Grid,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  Table as MuiTable,
} from '@material-ui/core';

import makeStyles from '@material-ui/styles/makeStyles';

import { SortAsc, SortDesc } from '../../icons';
import { DEFAULT_PAGE_SIZE } from '.';

export { SortingRule };
export interface QueryProps<D> {
  first: number;
  offset: number;
  sortBy?: SortingRule<D>[];
}

export interface QueryResponse<T> {
  data: T[];
  totalLength: number;
}

const useStyles = makeStyles(theme => ({
  container: { marginBottom: 100 },
  bodyCell: {
    padding: 9.5,
  },
  clickable: {
    cursor: 'pointer',
  },
  headerCell: {
    ...theme.typography.th,
  },
  loadingIndicator: { marginLeft: 'auto', marginRight: 'auto' },
  loadingIndicatorContainer: { display: 'flex', marginTop: 50 },
}));

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data?: T[];
  initialSortBy?: SortingRule<T>[];
  isLoading?: boolean;
  onFetchData: (props: QueryProps<T>) => void;
  onRowClick?: <T extends Record<string, unknown>>(row: Row<T>) => void;
  totalLength?: number;
}

const renderSortIcon = <D extends Record<string, unknown>>(
  column: ColumnInstance<D>
) => {
  if (!column.isSorted) return null;

  return !!column.isSortedDesc ? <SortDesc /> : <SortAsc />;
};

export const RemoteDataTable = <T extends Record<string, unknown>>({
  columns,
  data = [],
  initialSortBy,
  isLoading = false,
  onFetchData,
  onRowClick,
  totalLength = 0,
}: TableProps<T> & { children?: ReactNode }): JSX.Element => {
  const classes = useStyles();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.ceil(totalLength / pageSize);
  const hasRowClick = !!onRowClick;
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { sortBy },
  } = useTable(
    {
      columns,
      data,
      manualPagination: true,
      manualSortBy: true,
      pageCount,
      initialState: {
        pageIndex,
        pageSize,
        sortBy: initialSortBy,
      },
    },
    useSortBy,
    usePagination
  );

  const gotoPage = (page: number) => setPageIndex(page);
  const refetch = () =>
    onFetchData({
      offset: pageIndex * pageSize,
      first: pageSize,
      sortBy,
    });

  useEffect(() => {
    refetch();
  }, [pageSize, pageIndex]);

  useEffect(() => {
    setPageIndex(0);
    refetch();
  }, [sortBy]);

  return isLoading ? (
    <Box className={classes.loadingIndicatorContainer}>
      <CircularProgress className={classes.loadingIndicator} />
    </Box>
  ) : (
    <TableContainer className={classes.container}>
      <MuiTable stickyHeader {...getTableProps()}>
        <TableHead>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <TableRow {...getHeaderGroupProps()}>
              {headers.map(column => (
                <TableCell
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  className={classes.headerCell}
                >
                  <Grid container>
                    {column.render('Header')}
                    {renderSortIcon(column)}
                  </Grid>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <TableRow
                {...row.getRowProps()}
                onClick={() => onRowClick && onRowClick(row)}
                hover={hasRowClick}
              >
                {row.cells.map(cell => {
                  return (
                    <TableCell
                      {...cell.getCellProps()}
                      className={clsx(
                        classes.bodyCell,
                        hasRowClick && classes.clickable
                      )}
                    >
                      {cell.render('Cell')}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
          <TableRow>
            <TablePagination
              page={pageIndex}
              rowsPerPage={pageSize}
              count={pageCount * pageSize}
              onPageChange={(_, i) => gotoPage(i)}
              onRowsPerPageChange={({ target: { value } }) =>
                setPageSize(Number(value))
              }
            />
          </TableRow>
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
};
