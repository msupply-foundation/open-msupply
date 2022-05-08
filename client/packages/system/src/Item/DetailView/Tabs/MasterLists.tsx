import React from 'react';
import {
  MasterListRowFragment,
  useMasterLists,
} from '@openmsupply-client/system';
import { BasicSpinner } from '@common/components';
import {
  DataTable,
  TableProvider,
  useColumns,
  createTableStore,
  Box,
  createQueryParamsStore,
} from '@openmsupply-client/common';

export const MasterListsTab = () => {
  const { data, isLoading } = useMasterLists();
  const columns = useColumns<MasterListRowFragment>([
    'code',
    ['name', { width: 150 }],
    'description',
  ]);

  if (isLoading) return <BasicSpinner />;

  return (
    <Box justifyContent="center" display="flex">
      <Box flex={1} display="flex" style={{ maxWidth: 1000 }}>
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore({
            initialSortBy: { key: 'name' },
          })}
        >
          <DataTable data={data?.nodes} columns={columns} />
        </TableProvider>
      </Box>
    </Box>
  );
};
