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
import { DomainObject } from '@common/types';
import { useTranslation } from '@common/intl';
import { useTableStore } from './context';

export const DataTable = <T extends DomainObject>({
  columns,
  data = [],
  isLoading = false,
  onRowClick,
  pagination,
  onChangePage,
  noDataMessage,
  ExpandContent,
  dense = false,
}: TableProps<T>): JSX.Element => {
  const t = useTranslation('common');
  const { setActiveRows } = useTableStore();
  useEffect(() => {
    if (data.length) setActiveRows(data.map(({ id }) => id as string));
  }, [data]);

  // guard against a page number being set which is greater than the data allows
  useEffect(() => {
    if (!pagination || !onChangePage || !pagination.total) return;
    const { page, first, total } = pagination;
    if (page * first > total) onChangePage(0);
  }, [pagination]);

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
          {noDataMessage || t('error.no-results')}
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowX: 'unset',
      }}
    >
      <MuiTable sx={{ display: 'block', flex: 1 }}>
        <TableHead
          sx={{
            backgroundColor: dense ? 'transparent' : 'background.white',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            boxShadow: dense ? null : theme => theme.shadows[2],
          }}
        >
          <HeaderRow dense={dense}>
            {columns.map(column => (
              <HeaderCell
                dense={dense}
                column={column}
                key={String(column.key)}
              />
            ))}
          </HeaderRow>
        </TableHead>
        <TableBody sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {data.map((row, idx) => {
            return (
              <DataRow
                ExpandContent={ExpandContent}
                rowIndex={idx}
                columns={columns}
                key={row.id}
                onClick={onRowClick}
                rowData={row}
                rowKey={String(idx)}
                dense={dense}
              />
            );
          })}
        </TableBody>
      </MuiTable>
      {pagination && onChangePage && (
        <PaginationRow
          page={pagination.page}
          offset={pagination.offset}
          first={pagination.first}
          total={pagination.total ?? 0}
          onChange={onChangePage}
        />
      )}
    </TableContainer>
  );
};
