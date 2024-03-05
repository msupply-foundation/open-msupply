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
import { BreachTypeCell, useFormatTemperature } from '../../../common';
import { Toolbar } from './Toolbar';

const temperatureLogFilterAndSort = {
  initialSort: { key: 'datetime', dir: 'asc' as 'asc' | 'desc' },
  filters: [
    { key: 'datetime', condition: 'between' },
    {
      key: 'sensor.name',
    },
    {
      key: 'location.name',
    },
    {
      key: 'temperatureBreach.type',
      condition: 'equalTo',
    },
  ],
};

const ListView: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams(temperatureLogFilterAndSort);
  const queryParams = {
    filterBy,
    offset,
    sortBy,
    first,
  };

  const { data, isLoading, isError } =
    useTemperatureLog.document.list(queryParams);
  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');
  const formatTemperature = useFormatTemperature;

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
        key: 'location',
        label: 'label.location',
        accessor: ({ rowData }) => rowData.location?.code,
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
          return `${formatTemperature(rowData.temperature)}`;
        },
      },
      {
        key: 'breach',
        label: 'label.breach-type',
        description: 'description.breach-type',
        accessor: ({ rowData }) => rowData?.temperatureBreach?.type,
        Cell: BreachTypeCell,
        sortable: false,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <DataTable
        id="temperature-log-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere body={t('error.no-temperature-logs')} />}
      />
    </>
  );
};

export const TemperatureLogList: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
