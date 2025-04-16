import React from 'react';
import {
  DataTable,
  useColumns,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { MasterListLineFragment } from '../api/operations.generated';
import { useMasterListLines } from '../api/hooks/useMasterListLines';

export const ContentArea = () => {
  const t = useTranslation();
  const { data, isLoading, isError } = useMasterListLines();
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    initialSort: { key: 'itemName', dir: 'asc' },
  });
  const pagination = { page, first, offset };

  const columns = useColumns<MasterListLineFragment>(
    [
      [
        'itemCode',
        {
          width: 100,
          accessor: ({ rowData }) => rowData.item.code,
          getSortValue: rowData => rowData.item.code,
        },
      ],
      [
        'itemName',
        {
          width: 350,
          accessor: ({ rowData }) => rowData.item.name,
          getSortValue: rowData => rowData.item.name,
        },
      ],
      [
        'itemUnit',
        {
          accessor: ({ rowData }) => rowData.item.unitName,
          sortable: false,
        },
      ],
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <DataTable
      id="master-list-detail"
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data?.nodes}
      isError={isError}
      isLoading={isLoading}
      noDataMessage={t('error.no-items')}
    />
  );
};
