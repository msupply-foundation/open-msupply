import React, { FC, useMemo } from 'react';
import { useUrlQueryParams } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  TemperatureLogFragment,
  useTemperatureLog,
} from '../../api/TemperatureLog';
import {
  ColumnDef,
  Formatter,
  MaterialTable,
  NothingHere,
  usePaginatedMaterialTable,
} from '@openmsupply-client/common';
import { BreachTypeCell, useFormatTemperature } from '../../../common';
import { breachTypeOptions, Toolbar } from '../Toolbar';

export const TemperatureLogList: FC = () => {
  const {
    filter,
    queryParams,
  } = useUrlQueryParams({
    initialSort: { key: 'datetime', dir: 'asc' },
    filters: [
      { key: 'datetime', condition: 'between' },
      {
        key: 'sensor.name',
      },
      {
        key: 'location.code',
      },
      {
        key: 'temperatureBreach.type',
        condition: 'equalTo',
      },
    ],
  });

  const { data, isLoading, isError } = useTemperatureLog.document.list(queryParams);

  const t = useTranslation();
  const formatTemperature = useFormatTemperature();

  const columns = useMemo(
    (): ColumnDef<TemperatureLogFragment>[] => [
      {
        accessorKey: 'datetime',
        header: t('label.date-time'),
        Cell: ({ row: { original: row } }) => Formatter.csvDateTimeString(row.datetime),
        enableSorting: true,
      },
      {
        accessorKey: 'sensor.name',
        header: t('label.sensor-name'),
        enableColumnFilter: true,
      },
      {
        accessorKey: 'location.code',
        header: t('label.location'),
        enableColumnFilter: true,
      },
      {
        accessorKey: 'cce',
        header: t('label.cce'),
      },
      {
        accessorKey: 'temperature',
        header: t('label.temperature'),
        Cell: ({ row: { original: row } }) => formatTemperature(row.temperature),
        enableSorting: true,
      },
      {
        accessorKey: 'temperatureBreach.type',
        header: t('label.breach-type'),
        description: 'description.breach-type',
        Cell: BreachTypeCell,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: breachTypeOptions(t),
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable<TemperatureLogFragment>({
    tableId: 'temperature-log-list',
    isLoading,
    isError,
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    noDataElement: <NothingHere body={t('error.no-temperature-logs')} />,
  });

  return (
    <>
      <Toolbar filter={filter} />
      <MaterialTable table={table} />
    </>
  );
};
