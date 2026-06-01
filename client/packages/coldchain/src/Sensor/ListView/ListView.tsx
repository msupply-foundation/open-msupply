import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  Formatter,
  useEditModal,
  useUrlQuery,
  SensorNodeType,
  UNDEFINED_STRING_VALUE,
  MaterialTable,
  usePaginatedMaterialTable,
  ColumnDef,
  ColumnType,
  Typography,
} from '@openmsupply-client/common';
import { Switch } from '@common/components';
import { SensorFragment, useSensorList } from '../api';
import { SensorEditModal } from '../Components';
import { BreachTypeCell, useFormatTemperature } from '../../common';

export const SensorListView: FC = () => {
  const t = useTranslation();
  const { urlQuery, updateQuery } = useUrlQuery();
  const formatTemperature = useFormatTemperature();
  const [activeOnly, setActiveOnly] = useState(true);

  const { queryParams } = useUrlQueryParams({
    initialSort: { key: 'serial', dir: 'desc' },
    filters: [{ key: 'serial' }, { key: 'name' }],
  });

  const activeQueryParams = {
    ...queryParams,
    filterBy: activeOnly
      ? { ...queryParams.filterBy, isActive: true }
      : queryParams.filterBy,
  };

  const { data, isError, isLoading } = useSensorList(activeQueryParams);

  const { isOpen, entity, onClose, onOpen } = useEditModal<SensorFragment>();

  // this will open the edit modal, if the `edit` query parameter is set
  // to a valid sensor ID. On opening, the query param is removed to
  // prevent a loop which would happen if a sensor was edited
  useEffect(() => {
    const sensorId = (urlQuery['edit'] as string) ?? '';
    if (sensorId) {
      const sensor = data?.nodes?.find(s => s.id === sensorId);
      if (sensor) {
        updateQuery({ edit: '' });
        onOpen(sensor);
      }
    }
  }, [data?.nodes, onOpen, updateQuery, urlQuery]);

  const columns = useMemo(
    (): ColumnDef<SensorFragment>[] => [
      {
        accessorKey: 'name',
        header: t('label.name'),
        size: 200,
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: 'status',
        header: t('label.status'),
        size: 100,
        accessorFn: row => row.isActive,
        Cell: ({ cell }) => {
          const isActive = cell.getValue<boolean>();
          return (
            <Typography sx={{ color: isActive ? 'inherit' : 'gray.main' }}>
              {isActive ? t('label.active') : t('label.inactive')}
            </Typography>
          );
        },
      },
      {
        id: 'cce',
        accessorFn: row =>
          row.assets?.nodes?.map(asset => asset.assetNumber).join(', '),
        header: t('label.cce'),
      },
      {
        accessorKey: 'location.code',
        header: t('label.location'),
      },
      {
        accessorKey: 'serial',
        header: t('label.serial'),
        enableSorting: true,
      },
      {
        id: 'battery',
        header: t('label.battery-level'),
        accessorFn: row => {
          const batteryLevel = row.batteryLevel;
          return batteryLevel ? `${batteryLevel}%` : UNDEFINED_STRING_VALUE;
        },
      },
      {
        id: 'lastReading',
        header: t('label.last-reading'),
        accessorFn: row =>
          !!row.latestTemperatureLog?.nodes[0]?.temperature
            ? `${formatTemperature(
                row.latestTemperatureLog?.nodes[0]?.temperature
              )}`
            : UNDEFINED_STRING_VALUE,
        size: 130,
      },
      {
        id: 'lastRecording',
        header: t('label.date-time'),
        description: 'description.last-reading-datetime',
        accessorFn: row => row.latestTemperatureLog?.nodes[0]?.datetime,
        columnType: ColumnType.DateTime,
      },
      {
        id: 'type',
        header: t('label.sensor-type'),
        accessorFn: row => {
          return row?.type === SensorNodeType.BlueMaestro
            ? t('label.rtmd')
            : Formatter.enumCase(row?.type);
        },
      },
      {
        accessorKey: 'breach',
        header: t('label.breach-type'),
        description: 'description.breach-type',
        Cell: BreachTypeCell,
      },
    ],
    []
  );

  const { table } = usePaginatedMaterialTable<SensorFragment>({
    tableId: 'sensor-list',
    columns,
    data: data?.nodes,
    totalCount: data?.totalCount ?? 0,
    isLoading,
    isError,
    enableRowSelection: false,
    onRowClick: onOpen,
    noDataElement: <NothingHere body={t('error.no-sensors')} />,
  });

  return (
    <>
      {isOpen && entity && (
        <SensorEditModal isOpen={isOpen} onClose={onClose} sensor={entity} />
      )}
      <AppBarContentPortal
        sx={{
          paddingBottom: '16px',
          display: 'flex',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Switch
          checked={activeOnly}
          onChange={(_, checked) => setActiveOnly(checked)}
          label={t('label.active-only')}
          labelPlacement="end"
          size="small"
        />
      </AppBarContentPortal>
      <MaterialTable table={table} />
    </>
  );
};
