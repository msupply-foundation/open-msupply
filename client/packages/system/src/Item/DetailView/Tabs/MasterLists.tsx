import React from 'react';
import {
  MasterListRowFragment,
  useMasterList,
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

const MasterListsTable = () => {
  const { data, isLoading } = useMasterList.document.list();
  const columns = useColumns<MasterListRowFragment>([
    'code',
    ['name', { width: 150 }],
    'description',
  ]);

  if (isLoading) return <BasicSpinner />;

  return (
    <DataTable id="master-list-detail" data={data?.nodes} columns={columns} />
  );
};

export const MasterListsTab = () => (
  <Box justifyContent="center" display="flex" flex={1} paddingTop={3}>
    <Box flex={1} display="flex" style={{ maxWidth: 1000 }}>
      <TableProvider
        createStore={createTableStore()}
        queryParamsStore={createQueryParamsStore({
          initialSortBy: { key: 'name' },
        })}
      >
        <MasterListsTable />
      </TableProvider>
    </Box>
  </Box>
);
