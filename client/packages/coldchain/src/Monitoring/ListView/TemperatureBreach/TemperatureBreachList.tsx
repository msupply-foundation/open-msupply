import React, { FC } from 'react';
import { useUrlQueryParams } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  CircleAlertIcon,
  DataTable,
  Formatter,
  NothingHere,
  TableProvider,
  createTableStore,
  useColumns,
  useTheme,
} from '@openmsupply-client/common';
import {
  TemperatureBreachFragment,
  useTemperatureBreach,
} from '../../api/TemperatureBreach';
import { BreachTypeCell } from '../../../common';
import { Toolbar } from './Toolbar';

const ListView: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'startDatetime', dir: 'desc' },
    filters: [
      { key: 'startDatetime', condition: 'between' },
      {
        key: 'sensor.name',
      },
      {
        key: 'location.name',
      },
      {
        key: 'type',
        condition: 'equalTo',
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

  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');
  const theme = useTheme();

  const columns = useColumns<TemperatureBreachFragment>(
    [
      {
        key: 'acknowledgedIcon',
        Cell: ({ rowData }) => {
          return !rowData?.acknowledged ? (
            <CircleAlertIcon
              fill={theme.palette.error.main}
              sx={{ color: 'background.white' }}
            />
          ) : null;
        },
      },
      {
        key: 'acknowledged',
        label: 'label.status',
        accessor: ({ rowData }) => {
          return !!rowData?.acknowledged
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
        key: 'startDatetime',
        label: 'label.type-start',
        accessor: ({ rowData }) => {
          return Formatter.csvDateTimeString(rowData.startDatetime);
        },
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
        accessor: ({ rowData }) => {
          return Formatter.milliseconds(rowData.durationMilliseconds);
        },
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
        label: 'label.temperature',
        accessor: ({ rowData }) => {
          return !!rowData.maxOrMinTemperature
            ? `${rowData.maxOrMinTemperature}${t('label.temperature-unit')}`
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
    </>
  );
};

export const TemperatureBreachList: FC = () => (
  <TableProvider createStore={createTableStore}>
    <ListView />
  </TableProvider>
);
