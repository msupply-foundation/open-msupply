import React, { FC } from 'react';
import { useUrlQueryParams } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  TemperatureLogFragment,
  useTemperatureLog,
} from '../../api/TemperatureLog';
import {
  DataTable,
  Formatter,
  NothingHere,
  TableProvider,
  createTableStore,
  useColumns,
} from '@openmsupply-client/common';

const ListView: FC = () => {
  const { data, isLoading, isError } = useTemperatureLog.document.list();
  const {
    updateSortQuery,
    updatePaginationQuery,
    // filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filterKey: 'datetime' });

  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');

  const columns = useColumns<TemperatureLogFragment>(
    [
      {
        key: 'datetime',
        label: 'label.date-time',
        accessor: ({ rowData }) => {
          return Formatter.csvDateTimeString(rowData.datetime);
        },
      },
      {
        key: 'sensor',
        label: 'label.sensor-name',
        accessor: ({ rowData }) => rowData.sensor?.name,
        sortable: false,
      },
      {
        key: 'locationName',
        label: 'label.location',
        accessor: ({ rowData }) => rowData.location?.name,
        sortable: false,
      },
      {
        key: 'cce',
        label: 'label.cce',
        sortable: false,
      },
      {
        key: 'temperature',
        label: 'label.temperature',
        accessor: ({ rowData }) => {
          return `${rowData.temperature}${t('cold-chain.temperature-unit')}`;
        },
      },
      {
        key: 'breach',
        label: 'label.breach',
        accessor: ({ rowData }) => {
          return rowData?.temperatureBreach?.type
            ? t(Formatter.breachTypeTranslation(rowData.temperatureBreach.type))
            : null;
        },
        sortable: false,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <DataTable
      id="sensor-list"
      pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
      onChangePage={updatePaginationQuery}
      columns={columns}
      data={data?.nodes ?? []}
      isLoading={isLoading}
      isError={isError}
      noDataElement={<NothingHere body={t('error.no-temperature-logs')} />}
      enableColumnSelection
    />
  );
};

export const TemperatureLogList: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
