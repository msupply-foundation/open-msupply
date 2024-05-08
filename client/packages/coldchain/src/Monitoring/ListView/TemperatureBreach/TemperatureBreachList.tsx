import React, { FC } from 'react';
import { useUrlQueryParams } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  ColumnAlign,
  DataTable,
  Formatter,
  NothingHere,
  TableProvider,
  createTableStore,
  useColumns,
} from '@openmsupply-client/common';
import {
  TemperatureBreachFragment,
  useTemperatureBreach,
} from '../../api/TemperatureBreach';
import { BreachTypeCell } from '../../../common';
import { Toolbar } from './Toolbar';
import { useAcknowledgeBreachModal } from './useAcknowledgeBreachModal';
import { DurationCell, IconCell } from './TempereatureBreachCells';
import { useFormatTemperature } from '../../../common/utils';

const ListView: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'datetime', dir: 'desc' },
    filters: [
      { key: 'datetime', condition: 'between' },
      {
        key: 'sensor.name',
      },
      {
        key: 'location.code',
      },
      {
        key: 'type',
        condition: 'equalTo',
      },
      {
        key: 'unacknowledged',
        condition: '=',
      },
    ],
  });
  const queryParams = {
    filterBy,
    offset,
    sortBy,
    first,
  };
  const { data, isLoading, isError } =
    useTemperatureBreach.document.list(queryParams);
  const { AcknowledgeBreachModal, acknowledgeBreach } =
    useAcknowledgeBreachModal();

  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');
  const formatTemperature = useFormatTemperature();

  const columns = useColumns<TemperatureBreachFragment>(
    [
      {
        key: 'icon',
        sortable: false,
        width: 60,
        align: ColumnAlign.Center,
        Cell: ({ rowData }) => (
          <IconCell acknowledgeBreach={acknowledgeBreach} rowData={rowData} />
        ),
      },
      {
        key: 'unacknowledged',
        label: 'label.status',
        accessor: ({ rowData }) => {
          return !rowData?.unacknowledged
            ? t('label.acknowledged')
            : t('label.unacknowledged');
        },
        sortable: false,
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
        key: 'datetime',
        label: 'label.type-start',
        accessor: ({ rowData }) => {
          return Formatter.csvDateTimeString(rowData.startDatetime);
        },
        getSortValue: row => row.startDatetime,
      },
      {
        key: 'endDatetime',
        label: 'label.type-end',
        accessor: ({ rowData }) => {
          return Formatter.csvDateTimeString(rowData.endDatetime);
        },
      },
      {
        key: 'duration',
        label: 'label.duration',
        Cell: DurationCell,
        sortable: false,
      },
      {
        key: 'breach',
        label: 'label.type',
        accessor: ({ rowData }) => rowData?.type,
        Cell: BreachTypeCell,
        sortable: false,
      },
      {
        key: 'temperature',
        label: 'label.max-min-temperature',
        description: 'description.max-min-temperature',
        width: 125,
        accessor: ({ rowData }) => {
          return !!rowData.maxOrMinTemperature
            ? `${formatTemperature(rowData.maxOrMinTemperature)}`
            : null;
        },
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
        id="temperature-breach-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        isError={isError}
        noDataElement={
          <NothingHere body={t('error.no-temperature-breaches')} />
        }
        enableColumnSelection
      />
      <AcknowledgeBreachModal />
    </>
  );
};

export const TemperatureBreachList: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
