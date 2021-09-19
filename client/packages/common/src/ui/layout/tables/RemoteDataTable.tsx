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
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TableSortLabel,
  Table as MuiTable,
} from '@material-ui/core';

import { SortDesc } from '../../icons';
import { TableProps } from './types';
import { useSetupDataTableApi } from './hooks/useDataTableApi';
import { DataRow } from './components/DataRow/DataRow';
import { PaginationRow } from './columns/PaginationRow';

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
                const sortedByThisColumn = column.id === sortBy.key;

                return (
                  <TableCell
                    {...column.getHeaderProps()}
                    onClick={() =>
                      !column.disableSortBy && onSortBy({ key: column.id })
                    }
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
                      sortedByThisColumn ? sortBy.direction : false
                    }
                  >
                    <TableSortLabel
                      hideSortIcon={column.id === 'selection'}
                      active={!!sortedByThisColumn}
                      direction={sortBy.direction}
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
        offset={pagination.offset}
        first={pagination.first}
        total={pagination.total}
        onChange={onChangePage}
      />
    </TableContainer>
  );
};
