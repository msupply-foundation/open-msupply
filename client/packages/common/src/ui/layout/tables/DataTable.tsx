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

export const DataTable = <T extends DomainObject>({
  columns,
  data = [],
  isLoading = false,
  onRowClick,
  pagination,
  onChangePage,
  noDataMessageKey,
  height,
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
    <Box flexDirection="column" width="100%">
      <TableContainer>
        <MuiTable
          sx={{
            height,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TableHead>
            <HeaderRow>
              {columns.map(column => (
                <HeaderCell column={column} key={String(column.key)} />
              ))}
            </HeaderRow>
          </TableHead>
          <TableBody sx={{ overflow: 'auto', flex: 1 }}>
            {data.map((row, idx) => {
              return (
                <DataRow
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
      </TableContainer>
      <PaginationRow
        page={pagination.page}
        offset={pagination.offset}
        first={pagination.first}
        total={pagination.total ?? 0}
        onChange={onChangePage}
      />
    </Box>
  );
};
