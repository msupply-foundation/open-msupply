import React, { FC, useEffect } from 'react';
import {
  DataTable,
  useColumns,
  TableProvider,
  createTableStore,
  useTranslation,
  NothingHere,
  useUrlQueryParams,
  Formatter,
  useEditModal,
  useUrlQuery,
  SensorNodeType,
} from '@openmsupply-client/common';
import { useSensor, SensorFragment } from '../api';
import { SensorEditModal } from '../Components';
import { BreachTypeCell, useFormatTemperature } from '../../common';

export const SensorListView: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    // filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filters: [{ key: 'serial' }] });

  const { data, isError, isLoading } = useSensor.document.list();
  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');
  const { urlQuery, updateQuery } = useUrlQuery();
  const formatTemperature = useFormatTemperature();

  const columns = useColumns<SensorFragment>(
    [
      ['name', { width: 200 }],
      {
        key: 'cce',
        label: 'label.cce',
        sortable: false,
        accessor: ({ rowData }) =>
          rowData.assets?.nodes?.map(asset => asset.assetNumber).join(', '),
      },
      {
        key: 'location',
        label: 'label.location',
        accessor: ({ rowData }) => rowData.location?.code,
        sortable: false,
      },
      {
        key: 'serial',
        label: 'label.serial',
        accessor: ({ rowData }) => rowData?.serial,
      },
      {
        key: 'battery',
        label: 'label.battery-level',
        accessor: ({ rowData }) => {
          const batteryLevel = rowData.batteryLevel;

          return batteryLevel ? `${batteryLevel}%` : '-';
        },
        sortable: false,
      },
      {
        key: 'lastReading',
        label: 'label.last-reading',
        accessor: ({ rowData }) => {
          return !!rowData.latestTemperatureLog?.nodes[0]?.temperature
            ? `${formatTemperature(
                rowData.latestTemperatureLog?.nodes[0]?.temperature
              )}`
            : '-';
        },
        sortable: false,
      },
      {
        key: 'lastRecording',
        label: 'label.date-time',
        description: 'description.last-reading-datetime',
        accessor: ({ rowData }) => {
          return Formatter.csvDateTimeString(
            rowData.latestTemperatureLog?.nodes[0]?.datetime
          );
        },
        sortable: false,
      },
      {
        key: 'type',
        label: 'label.sensor-type',
        accessor: ({ rowData }) => {
          return rowData?.type === SensorNodeType.BlueMaestro
            ? t('label.rtmd')
            : Formatter.enumCase(rowData?.type);
        },
        sortable: false,
      },
      {
        key: 'breach',
        label: 'label.breach-type',
        description: 'description.breach-type',
        accessor: ({ rowData }) => rowData?.breach,
        Cell: BreachTypeCell,
        sortable: false,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

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
  }, [data?.nodes]);

  return (
    <>
      {isOpen && entity && (
        <SensorEditModal isOpen={isOpen} onClose={onClose} sensor={entity} />
      )}
      <DataTable
        id="sensor-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={onOpen}
        isError={isError}
        noDataElement={<NothingHere body={t('error.no-sensors')} />}
        enableColumnSelection
      />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <SensorListView />
  </TableProvider>
);
