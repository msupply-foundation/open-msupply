/* eslint-disable react/jsx-key */
import React, { ReactNode, useEffect, useState } from 'react';

import {
  Column,
  ColumnInstance,
  Row,
  usePagination,
  useSortBy,
  useTable,
} from 'react-table';
import { QueryObserverResult } from 'react-query';
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

export interface QueryProps {
  first: number;
  offset: number;
  sort?: string;
  desc?: boolean;
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
  onFetchData: (props: QueryProps) => Promise<QueryObserverResult<T>>;
  onRowClick?: <T extends Record<string, unknown>>(row: Row<T>) => void;
}

const renderSortIcon = <D extends Record<string, unknown>>(
  column: ColumnInstance<D>
) => {
  if (!column.isSorted) return null;

  return !!column.isSortedDesc ? <SortDesc /> : <SortAsc />;
};

export const RemoteDataTable = <T extends Record<string, unknown>>({
  columns,
  onFetchData,
  onRowClick,
}: TableProps<T> & { children?: ReactNode }): JSX.Element => {
  const classes = useStyles();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [tableData, setTableData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasRowClick = !!onRowClick;
  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable(
      {
        columns,
        data: tableData,
        manualPagination: true,
      },
      useSortBy,
      usePagination
    );
  const gotoPage = (page: number) => setPageIndex(page);

  useEffect(() => {
    setIsLoading(true);
    onFetchData({
      offset: pageIndex * pageSize,
      first: pageSize,
    }).then((result: QueryObserverResult) => {
      const { data: response } = result;
      setTableData((response as QueryResponse<T>).data);
      setPageCount(
        Math.ceil((response as QueryResponse<T>).totalLength || 0) / pageSize
      );
      setIsLoading(false);
    });
  }, [pageSize, pageIndex]);

  useEffect(() => setIsLoading(!tableData), [tableData]);

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
