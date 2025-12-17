import React, { FC, useMemo } from 'react';
import {
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  useEditModal,
  InsertAssetLogReasonInput,
  MaterialTable,
  ColumnDef,
  useNonPaginatedMaterialTable,
  TableProvider,
  createTableStore,
} from '@openmsupply-client/common';
import { AssetLogReasonFragment, useAssetLogReasonList } from '../api';
import { getStatusOptions, parseStatus } from '../utils';
import { AppBarButtons } from './AppBarButtons';
import { LogReasonCreateModal } from './LogReasonCreateModal';
import { Footer } from './Footer';

export const AssetLogReasonsListView: FC = () => {
  const t = useTranslation();
  const { queryParams: { filterBy } } = useUrlQueryParams({
    initialSort: { key: 'reason', dir: 'asc' },
    filters: [
      { key: 'reason' },
      {
        key: 'assetLogStatus',
        condition: 'equalTo',
      },
    ],
  });

  const { data, isError, isLoading } = useAssetLogReasonList(filterBy);

  const columns = useMemo(
    (): ColumnDef<AssetLogReasonFragment>[] => [
      {
        id: 'assetLogStatus',
        accessorFn: row => parseStatus(row.assetLogStatus, t),
        header: t('label.status'),
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: getStatusOptions(t),
      },
      {
        accessorKey: 'reason',
        header: t('label.reason'),
      },
    ],
    []
  );

  const { table, selectedRows } = useNonPaginatedMaterialTable<AssetLogReasonFragment>({
    tableId: 'asset-log-reasons-list',
    data: data?.nodes,
    manualFiltering: true,
    columns,
    isLoading,
    isError,
    noDataElement: (
      <NothingHere
        body={t('error.no-asset-log-reasons')}
        onCreate={() => onOpen()}
      />
    ),
  });

  const { isOpen, entity, onClose, onOpen } =
    useEditModal<InsertAssetLogReasonInput>();

  return (
    <TableProvider createStore={createTableStore}>
      {isOpen && (
        <LogReasonCreateModal
          isOpen={isOpen}
          onClose={onClose}
          logReason={entity}
        />
      )}
      <AppBarButtons onCreate={() => onOpen()} />
      <MaterialTable table={table} />
      <Footer selectedRows={selectedRows} resetRowSelection={table.resetRowSelection} />
    </TableProvider>
  );
};
