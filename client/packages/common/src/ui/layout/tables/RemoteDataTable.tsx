/* eslint-disable react/jsx-key */
import React, { useEffect } from 'react';

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
import { DomainObject } from '../../../types';
import { useTranslation } from '../../../intl';
import { useTableStore } from './context';

export const RemoteDataTable = <T extends DomainObject>({
  columns,
  sortBy,
  data = [],
  isLoading = false,
  onRowClick,
  pagination,
  onChangePage,
  noDataMessageKey,
}: TableProps<T>): JSX.Element => {
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

  if (data.length === 0) {
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
          <HeaderRow>
            {columns.map(column => (
              <HeaderCell
                sortBy={sortBy}
                column={column}
                key={String(column.key)}
              >
                <column.Header column={column} />
              </HeaderCell>
            ))}
          </HeaderRow>
        </TableHead>
        <TableBody sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {data.map((row, idx) => {
            return (
              <DataRow<T>
                columns={columns}
                key={row.id}
                onClick={onRowClick}
                rowData={row}
                rowKey={String(idx)}
              />
            );
          })}
        </TableBody>
      </MuiTable>
      <PaginationRow
        page={pagination.page}
        offset={pagination.offset}
        first={data.length}
        total={pagination.total ?? 0}
        onChange={onChangePage}
      />
    </TableContainer>
  );
};
