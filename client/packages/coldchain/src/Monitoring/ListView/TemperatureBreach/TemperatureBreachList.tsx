import React, { FC } from 'react';
import { useUrlQueryParams } from '@common/hooks';
import { useFormatDateTime, useTranslation } from '@common/intl';
import {
  Box,
  CellProps,
  CircleAlertIcon,
  DataTable,
  Formatter,
  NothingHere,
  TableProvider,
  Typography,
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

const DurationCell = ({ rowData }: CellProps<TemperatureBreachFragment>) => {
  const t = useTranslation('coldchain');
  const { localisedDistance } = useFormatDateTime();
  const duration = !rowData.endDatetime
    ? t('label.ongoing')
    : localisedDistance(rowData.startDatetime, rowData.endDatetime);

  return (
    <Box
      flexDirection="row"
      display="flex"
      flex={1}
      sx={
        !rowData.endDatetime
          ? {
              color: 'error.main',
              fontStyle: 'italic',
            }
          : {}
      }
    >
      <Typography
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: 'inherit',
          fontSize: 'inherit',
        }}
      >
        {duration}
      </Typography>
    </Box>
  );
};

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

  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');
  const theme = useTheme();
  const columns = useColumns<TemperatureBreachFragment>(
    [
      {
        key: 'acknowledgedIcon',
        Cell: ({ rowData }) => {
          return !!rowData?.unacknowledged ? (
            <CircleAlertIcon
              fill={theme.palette.error.main}
              sx={{ color: 'background.white' }}
            />
          ) : null;
        },
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
