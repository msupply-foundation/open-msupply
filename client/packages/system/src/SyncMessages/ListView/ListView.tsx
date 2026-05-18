import React, { useMemo } from 'react';
import {
  ColumnDef,
  ColumnType,
  MaterialTable,
  NothingHere,
  SyncMessageNodeStatus,
  SyncMessageNodeType,
  useEditModal,
  usePaginatedMaterialTable,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { SyncMessageRowFragment, useSyncMessageList } from '../api';
import { statusMapping, typeMapping } from './utils';
import { SyncMessageModal } from './SyncMessageModal';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';

export const SyncMessageListView = () => {
  const t = useTranslation();

  const { isOpen, entity, onClose, onOpen, mode } =
    useEditModal<SyncMessageRowFragment>();

  const {
    queryParams: { first, offset, sortBy, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDatetime', dir: 'desc' },
    filters: [
      { key: 'createdDatetime', condition: 'between' },
      { key: 'status', condition: 'equalTo' },
      { key: 'type', condition: 'equalTo' },
    ],
  });

  const {
    query: { data, isFetching, isError },
  } = useSyncMessageList({ sortBy, first, offset, filterBy });

  const columns = useMemo(
    (): ColumnDef<SyncMessageRowFragment>[] => [
      {
        id: 'fromStore',
        header: t('label.from-store'),
        accessorFn: row => row.fromStore?.storeName,
      },
      {
        id: 'toStore',
        header: t('label.to-store'),
        accessorFn: row => row.toStore?.storeName,
      },
      {
        accessorKey: 'createdDatetime',
        header: t('label.created-datetime'),
        columnType: ColumnType.Date,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        accessorKey: 'status',
        header: t('label.status'),
        accessorFn: row => t(statusMapping(row.status)),
        enableSorting: true,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: Object.values(SyncMessageNodeStatus).map(
          status => ({ value: status, label: t(statusMapping(status)) })
        ),
      },
      {
        accessorKey: 'type',
        header: t('label.type'),
        accessorFn: row => t(typeMapping(row.type)),
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: Object.values(SyncMessageNodeType).map(type => ({
          value: type,
          label: t(typeMapping(type)),
        })),
      },
      {
        accessorKey: 'errorMessage',
        header: t('label.error-message'),
      },
    ],
    [t]
  );

  const { table } = usePaginatedMaterialTable({
    tableId: 'sync-message-list',
    isLoading: isFetching,
    isError,
    columns,
    data: data?.nodes ?? [],
    totalCount: data?.totalCount ?? 0,
    onRowClick: onOpen,
    noDataElement: <NothingHere body={t('error.no-sync-messages')} />,
  });

  return (
    <>
      <Toolbar />
      <AppBarButtons onOpen={onOpen} />
      <MaterialTable table={table} />
      {isOpen && (
        <SyncMessageModal
          lineId={entity?.id}
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
        />
      )}
    </>
  );
};
