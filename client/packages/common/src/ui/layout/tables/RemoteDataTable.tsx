/* eslint-disable react/jsx-key */
import React from 'react';

import {
  SortingRule,
  useRowSelect,
  useTable,
  useFlexLayout,
  Row,
} from 'react-table';

import {
  Box,
  CircularProgress,
  TableBody,
  TableHead,
  TableContainer,
  Table as MuiTable,
} from '@mui/material';

import { TableProps } from './types';
import { useSetupDataTableApi } from './hooks/useDataTableApi';
import { DataRow } from './components/DataRow/DataRow';
import { PaginationRow } from './columns/PaginationRow';
import { HeaderCell, HeaderRow } from './components/Header';
import { KeyOf } from '../../../types';

export { SortingRule };

export const RemoteDataTable = <T extends Record<string, unknown>>({
  columns,
  sortBy,
  data = [],
  isLoading = false,
  onSortBy,
  onRowClick,
  pagination,
  tableApi,
  onChangePage,
}: TableProps<T>): JSX.Element => {
  const tableInstance = useTable(
    {
      columns,
      data,
    },
    useRowSelect,
    useFlexLayout
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    tableInstance;

  useSetupDataTableApi(tableApi, tableInstance);

  return isLoading ? (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  ) : (
    <TableContainer
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <MuiTable
        stickyHeader
        {...getTableProps()}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <TableHead>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <HeaderRow key={getHeaderGroupProps().key}>
              {headers.map(column => (
                <HeaderCell
                  style={column.getHeaderProps().style ?? {}}
                  onSortBy={onSortBy}
                  key={column.getHeaderProps().key}
                  isSortable={!column.disableSortBy}
                  isSorted={column.id === sortBy.key}
                  align={column.align}
                  id={column.id as KeyOf<T>}
                  direction={sortBy.direction}
                >
                  {column.render('Header')}
                </HeaderCell>
              ))}
            </HeaderRow>
          ))}
        </TableHead>
        <TableBody
          {...getTableBodyProps()}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            overflow: 'hidden',
          }}
        >
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
        </TableBody>
      </MuiTable>
      <PaginationRow
        page={pagination.page}
        offset={pagination.offset}
        first={pagination.first}
        total={pagination.total ?? 0}
        onChange={onChangePage}
      />
    </TableContainer>
  );
};
