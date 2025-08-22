import {
  ColumnDescription,
  ColumnFormat,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { SyncMessageRowFragment } from '../api';

export const useSyncMessageColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({
    initialSort: { key: 'createdDateTime', dir: 'asc' },
  });

  const columns: ColumnDescription<SyncMessageRowFragment>[] = [
    {
      key: 'toStoreId',
      label: 'label.to-store',
      accessor: ({ rowData }) => rowData?.toStoreId,
    },
    {
      key: 'fromStoreId',
      label: 'label.from-store',
      accessor: ({ rowData }) => rowData?.fromStoreId,
    },
    {
      key: 'createdDatetime',
      label: 'label.created-datetime',
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData?.createdDatetime,
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => rowData?.status,
    },
    {
      key: 'type',
      label: 'label.type',
      accessor: ({ rowData }) => rowData?.type,
    },
  ];

  return useColumns<SyncMessageRowFragment>(
    columns,
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );
};
