import {
  ColumnDescription,
  ColumnFormat,
  useColumns,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { SyncMessageRowFragment } from '../api';
import { statusMapping, typeMapping } from './utils';

export const useSyncMessageColumns = () => {
  const t = useTranslation();

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
      accessor: ({ rowData }) => {
        const status = statusMapping(rowData?.status);
        return t(status);
      },
    },
    {
      key: 'type',
      label: 'label.type',
      accessor: ({ rowData }) => {
        const type = typeMapping(rowData?.type);
        return t(type);
      },
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
