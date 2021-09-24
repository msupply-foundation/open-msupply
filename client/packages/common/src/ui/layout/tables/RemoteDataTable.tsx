/* eslint-disable react/jsx-key */
import React, { useEffect } from 'react';
import { useTable, Row } from 'react-table';

import {
  Box,
  CircularProgress,
  TableBody,
  TableHead,
  TableContainer,
  Table as MuiTable,
  Typography,
} from '@mui/material';

import { TableProps } from './types';
import { DataRow } from './components/DataRow/DataRow';
import { PaginationRow } from './columns/PaginationRow';
import { HeaderCell, HeaderRow } from './components/Header';
import { KeyOf } from '../../../types';
import { useTranslation } from '../../../intl';
import { useTableStore } from './context';

export const RemoteDataTable = <T extends Record<string, unknown>>({
  columns,
  sortBy,
  data = [],
  isLoading = false,
  onSortBy,
  onRowClick,
  pagination,
  onChangePage,
  noDataMessageKey,
}: TableProps<T>): JSX.Element => {
  const { headerGroups, rows, prepareRow } = useTable({
    columns,
    data,
  });

  const t = useTranslation();
  const { setActiveRows } = useTableStore();
  useEffect(() => {
    if (data.length) setActiveRows(data.map(({ id }) => id as string));
  }, [data]);

  if (isLoading)
    return (
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
    );

  if (rows.length === 0) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography variant="h6">
          {t(noDataMessageKey || 'error.no-results')}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'column',
      }}
    >
      <MuiTable sx={{ display: 'block', overflow: 'auto' }}>
        <TableHead sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {headerGroups.map(({ getHeaderGroupProps, headers }) => (
            <HeaderRow key={getHeaderGroupProps().key}>
              {headers.map(column => (
                <HeaderCell
                  minWidth={column.minWidth}
                  width={Number(column.width)}
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
        <TableBody sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
