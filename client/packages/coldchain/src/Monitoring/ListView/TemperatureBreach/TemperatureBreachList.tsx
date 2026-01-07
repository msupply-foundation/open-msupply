import React, { FC, useMemo } from 'react';
import { useUrlQueryParams } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  ColumnAlign,
  ColumnDef,
  Formatter,
  MaterialTable,
  NothingHere,
  usePaginatedMaterialTable,
} from '@openmsupply-client/common';
import {
  TemperatureBreachFragment,
  useTemperatureBreach,
} from '../../api/TemperatureBreach';
import { BreachTypeCell } from '../../../common';
import { breachTypeOptions, Toolbar } from '../Toolbar';
import { useAcknowledgeBreachModal } from './useAcknowledgeBreachModal';
import { DurationCell, IconCell } from './TempereatureBreachCells';
import { useFormatTemperature } from '../../../common/utils';

export const TemperatureBreachList: FC = () => {
  const {
    filter,
    queryParams,
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
  const { data, isLoading, isError } =
    useTemperatureBreach.document.list(queryParams);
  const { AcknowledgeBreachModal, acknowledgeBreach } =
    useAcknowledgeBreachModal();

  const t = useTranslation();
  const formatTemperature = useFormatTemperature();

  const columns = useMemo(
    (): ColumnDef<TemperatureBreachFragment>[] => [
      {
        accessorKey: 'icon',
        header: '',
        size: 60,
        align: ColumnAlign.Center,
        Cell: ({ row: { original: row } }) => (
          <IconCell acknowledgeBreach={acknowledgeBreach} rowData={row} />
        ),
      },
      {
        id: 'unacknowledged',
        accessorFn: row =>
          !row?.unacknowledged
            ? t('label.acknowledged')
            : t('label.unacknowledged'),
        header: t('label.status'),
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: [
          {
            label: t('label.acknowledged'),
            value: 'false',
          },
          {
            label: t('label.unacknowledged'),
            value: 'true',
          },
        ],
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
        id: 'datetime',
        accessorFn: row => row.startDatetime,
        header: t('label.type-start'),
        enableSorting: true,
        Cell: ({ row: { original: row } }) =>
          Formatter.csvDateTimeString(row.startDatetime),
      },
      {
        accessorKey: 'endDatetime',
        header: t('label.type-end'),
        enableSorting: true,
        Cell: ({ row: { original: row } }) =>
          Formatter.csvDateTimeString(row.endDatetime),
      },
      {
        accessorKey: 'duration',
        header: t('label.duration'),
        Cell: DurationCell,
      },
      {
        accessorKey: 'type',
        header: t('label.type'),
        Cell: BreachTypeCell,
        enableColumnFilter: true,
        filterVariant: 'select',
        filterSelectOptions: breachTypeOptions(t),
      },
      {
        accessorKey: 'temperature',
        header: t('label.max-min-temperature'),
        description: t('description.max-min-temperature'),
        size: 125,
        accessorFn: row =>
          !!row.maxOrMinTemperature
            ? `${formatTemperature(row.maxOrMinTemperature)}`
            : null,
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable<TemperatureBreachFragment>({
    tableId: 'temperature-breach-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isError,
    enableRowSelection: false,
    noDataElement: (
      <NothingHere body={t('error.no-temperature-breaches')} />
    ),
  })

  return (
    <>
      <Toolbar filter={filter} />
      <MaterialTable table={table} />
      <AcknowledgeBreachModal />
    </>
  );
};
