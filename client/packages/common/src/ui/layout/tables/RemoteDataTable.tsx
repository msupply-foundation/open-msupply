/* eslint-disable react/jsx-key */
import React, { useEffect, useState } from 'react';

import {
  SortingRule,
  usePagination,
  useRowSelect,
  useSortBy,
  useTable,
  useFlexLayout,
  Row,
} from 'react-table';

import {
  Box,
  CircularProgress,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  TableSortLabel,
  Table as MuiTable,
} from '@material-ui/core';

import { SortDesc } from '../../icons';
import { DEFAULT_PAGE_SIZE } from '.';
import { TableProps } from './types';
import { useSetupDataTableApi } from './hooks/useDataTableApi';
import { DataRow } from './components/DataRow/DataRow';

export { SortingRule };

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.ceil(totalLength / pageSize);
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
    useRowSelect,
    useFlexLayout
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
    <TableContainer>
      <MuiTable stickyHeader {...getTableProps()}>
        <TableHead>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <TableRow
              {...getHeaderGroupProps()}
              sx={{
                ...getHeaderGroupProps().style,
                display: 'flex',
                flex: '1 0 auto',

                height: '60px',
                paddingLeft: '20px',
                paddingRight: '20px',
                alignItems: 'center',
              }}
            >
              {headers.map(column => {
                return (
                  <TableCell
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                    align={column.align}
                    padding={'none'}
                    sx={{
                      backgroundColor: 'transparent',
                      borderBottom: '0px',

                      padding: 0,
                      paddingRight: '16px',
                    }}
                    aria-label={column.id}
                    sortDirection={
                      column.isSorted
                        ? column.isSortedDesc
                          ? 'desc'
                          : 'asc'
                        : false
                    }
                  >
                    <TableSortLabel
                      hideSortIcon={column.id === 'selection'}
                      active={column.isSorted}
                      direction={column.isSortedDesc ? 'desc' : 'asc'}
                      IconComponent={SortDesc}
                      sx={{ fontWeight: 'bold' }}
                    >
                      {column.render('Header')}
                    </TableSortLabel>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody {...getTableBodyProps()}>
          {rows.map((row: Row<T>) => {
            prepareRow(row);

            const { cells, original } = row;
            const { key } = row.getRowProps();

            return (
              <DataRow<T>
                cells={cells}
                key={key}
                onClick={onRowClick}
                rowData={original}
              />
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
