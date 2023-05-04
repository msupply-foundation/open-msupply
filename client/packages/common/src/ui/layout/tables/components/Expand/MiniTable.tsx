import React, { JSXElementConstructor } from 'react';
import { Column } from './../../columns/types';
import { Box, alpha } from '@mui/material';
import { RecordWithId } from '@common/types';
import { DataTable } from '../../DataTable';
import { createTableStore, TableProvider } from '../../context/TableContext';
import { createQueryParamsStore, QueryParamsState } from '@common/hooks';
import { StoreApi, UseBoundStore } from 'zustand';

interface MiniTableProps<T extends RecordWithId> {
  rows: T[];
  columns: Column<T>[];
  queryParamsStore?: UseBoundStore<StoreApi<QueryParamsState<T>>>;
}

export const MiniTable = <T extends RecordWithId>({
  rows,
  columns,
  queryParamsStore,
}: MiniTableProps<T>): React.ReactElement<
  MiniTableProps<T>,
  JSXElementConstructor<MiniTableProps<T>>
> => {
  return (
    <Box p={1} style={{ padding: '0 100px 5px 100px', width: '100%' }}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        sx={{
          backgroundColor: theme => alpha(theme.palette.gray.light, 0.2),
          border: theme => `1px solid ${alpha(theme.palette.gray.light, 0.2)}`,
          '& .MuiTableHead-root': { borderRadius: '16px 16px 0 0' },
          overflow: 'hidden',
        }}
      >
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={
            queryParamsStore ||
            createQueryParamsStore<T>({ initialSortBy: { key: 'name' } })
          }
        >
          <DataTable dense columns={columns} data={rows} id="mini-table" />
        </TableProvider>
      </Box>
    </Box>
  );
};
