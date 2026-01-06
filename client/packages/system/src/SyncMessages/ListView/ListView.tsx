import React from 'react';
import {
  createTableStore,
  DataTable,
  NothingHere,
  TableProvider,
  useEditModal,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { SyncMessageRowFragment, useSyncMessageList } from '../api';
import { useSyncMessageColumns } from './columns';
import { SyncMessageModal } from './SyncMessageModal';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

export const SyncMessageListView = () => {
  const t = useTranslation();
  const columns = useSyncMessageColumns();

  const { isOpen, entity, onClose, onOpen, mode } =
    useEditModal<SyncMessageRowFragment>();

  const {
    updatePaginationQuery,
    queryParams: { page, first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'createdDatetime' },
      {
        key: 'status',
        condition: 'equalTo',
      },
      {
        key: 'type',
        condition: 'equalTo',
      },
    ],
  });

  const pagination = { page, first, offset };
  const listParams = {
    sortBy,
    first,
    offset,
    filterBy,
  };

  const { data, isError, isLoading } = useSyncMessageList(listParams);

  return (
    <TableProvider createStore={createTableStore}>
      <Toolbar />
      <AppBarButtons onOpen={onOpen} />
      <DataTable
        id="sync-message-list"
        enableColumnSelection
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-purchase-orders')} />}
        onRowClick={onOpen}
      />
      {isOpen && (
        <SyncMessageModal
          lineId={entity?.id}
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
        />
      )}
    </TableProvider>
  );
};
