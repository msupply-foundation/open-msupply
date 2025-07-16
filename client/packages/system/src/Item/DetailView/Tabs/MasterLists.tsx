import React from 'react';
import {
  MasterListRowFragment,
  useMasterLists,
} from '@openmsupply-client/system';
import { BasicSpinner, NothingHere } from '@common/components';
import {
  DataTable,
  TableProvider,
  useColumns,
  createTableStore,
  Box,
  createQueryParamsStore,
  TooltipTextCell,
  useTranslation,
  useAuthContext,
} from '@openmsupply-client/common';

const MasterListsTable = ({ itemId }: { itemId?: string }) => {
  const t = useTranslation();
  const { store } = useAuthContext();

  const { data, isLoading } = useMasterLists({
    queryParams: {
      filterBy: {
        existsForStoreId: { equalTo: store?.id },
        itemId: { equalTo: itemId ?? '' },
      },
    },
  });

  const columns = useColumns<MasterListRowFragment>([
    ['code', { Cell: TooltipTextCell }],
    ['name', { width: 200, Cell: TooltipTextCell }],
    ['description', { minWidth: 100, Cell: TooltipTextCell }],
  ]);

  if (isLoading) return <BasicSpinner />;
  return (
    <DataTable
      id="master-list-detail"
      data={data?.nodes}
      columns={columns}
      noDataElement={<NothingHere body={t('error.no-master-list')} />}
    />
  );
};

export const MasterListsTab = ({ itemId }: { itemId?: string }) => (
  <Box justifyContent="center" display="flex" flex={1}>
    <Box flex={1} display="flex">
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore({
          initialSortBy: { key: 'name' },
        })}
      >
        <MasterListsTable itemId={itemId} />
      </TableProvider>
    </Box>
  </Box>
);
