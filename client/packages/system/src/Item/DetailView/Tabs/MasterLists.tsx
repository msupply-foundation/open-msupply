import React, { FC } from 'react';
import {
  MasterListRowFragment,
  useMasterList,
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
} from '@openmsupply-client/common';

const MasterListsTable: FC<{ itemId?: string }> = ({ itemId }) => {
  const { data, isLoading } = useMasterList.document.listByItemId(itemId ?? '');
  const t = useTranslation('catalogue');
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

export const MasterListsTab: FC<{ itemId?: string }> = ({ itemId }) => (
  <Box justifyContent="center" display="flex" flex={1} paddingTop={3}>
    <Box flex={1} display="flex" style={{ maxWidth: 1000 }}>
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
