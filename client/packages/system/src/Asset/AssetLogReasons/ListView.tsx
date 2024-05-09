import React, { FC } from 'react';
import {
  // useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  useEditModal,
  InsertAssetLogReasonInput,
} from '@openmsupply-client/common';
import { AssetLogReasonFragment, useAssetData } from '../api';
import { Toolbar } from './Toolbar';
import { parseStatus } from '../utils';
import { AppBarButtons } from './AppBarButtons';
import { LogReasonCreateModal } from './LogReasonCreateModal';

const AssetListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'reason', dir: 'asc' },
    filters: [{ key: 'reason' }, { key: 'status' }],
  });

  const { data, isError, isLoading } = useAssetData.log.listReasons();
  const pagination = { page, first, offset };
  const t = useTranslation(['catalogue', 'coldchain']);

  const columns = useColumns<AssetLogReasonFragment>(
    [
      {
        key: 'status',
        label: 'label.status',
        sortable: false,
        accessor: ({ rowData }) => parseStatus(rowData.assetLogStatus, t),
      },
      {
        key: 'reason',
        label: 'label.reason',
        sortable: false,
      },
      'selection',
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  const { isOpen, entity, onClose, onOpen } =
    useEditModal<InsertAssetLogReasonInput>();

  return (
    <>
      {isOpen && (
        <LogReasonCreateModal
          isOpen={isOpen}
          onClose={onClose}
          logReason={entity}
        />
      )}
      <AppBarButtons onCreate={() => onOpen()} />
      <Toolbar data={data?.nodes ?? []} filter={filter} />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const AssetLogReasonsListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <AssetListComponent />
  </TableProvider>
);
