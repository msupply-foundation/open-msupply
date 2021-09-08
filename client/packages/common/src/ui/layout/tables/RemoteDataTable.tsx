/* eslint-disable react/jsx-key */
import React, { useEffect, useState } from 'react';

import {
  ColumnInstance,
  SortingRule,
  usePagination,
  useRowSelect,
  useSortBy,
  useTable,
} from 'react-table';

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

import { useTheme } from '@material-ui/core/styles';

import { SortAsc, SortDesc } from '../../icons';
import { DEFAULT_PAGE_SIZE } from '.';
import { TableProps } from './types';
import { useSetupDataTableApi } from './hooks/useDataTableApi';

export { SortingRule };

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
  tableApi,
}: TableProps<T>): JSX.Element => {
  const theme = useTheme();
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.ceil(totalLength / pageSize);
  const hasRowClick = !!onRowClick;
  const tableInstance = useTable(
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
    usePagination,
    useRowSelect
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { sortBy },
  } = tableInstance;

  useSetupDataTableApi(tableApi, tableInstance);

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
    <Box
      sx={{
        display: 'flex',
        marginTop: 50,
      }}
    >
      <CircularProgress
        sx={{
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      />
    </Box>
  ) : (
    <TableContainer sx={{ marginBottom: 100 }}>
      <MuiTable stickyHeader {...getTableProps()}>
        <TableHead>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <TableRow {...getHeaderGroupProps()}>
              {headers.map(column => (
                <TableCell
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  sx={{
                    backgroundColor: 'transparent',
                    ...theme.typography.th,
                  }}
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
                      sx={{
                        padding: 0,
                        paddingLeft: '16px',
                        ...(hasRowClick && { cursor: 'pointer' }),
                      }}
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
