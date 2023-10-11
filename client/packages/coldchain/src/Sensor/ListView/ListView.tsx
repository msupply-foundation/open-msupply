import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { useSensor, SensorFragment } from '../api';
import { SensorEditModal } from '../Components';

export const SensorListView: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    // filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filterKey: 'serial' });

  const { data, isError, isLoading } = useSensor.document.list();
  const pagination = { page, first, offset };
  const t = useTranslation('coldchain');

  const columns = useColumns<SensorFragment>(
    [
      ['name'],
      {
        key: 'cce',
        label: 'label.cce',
      },
      {
        key: 'locationName',
        label: 'label.location',
        accessor: ({ rowData }) =>
          rowData.location?.name ?? 'No location assigned',
        sortable: false,
      },
      {
        key: 'serial',
        label: 'label.serial',
        accessor: ({ rowData }) => {
          const serial = rowData.serial;
          const serialSplit = serial.split('|');

          return serialSplit[0];
        },
      },
      {
        key: 'battery',
        label: 'label.battery-level',
        accessor: ({ rowData }) => {
          const batteryLevel = rowData.batteryLevel;

          return batteryLevel
            ? `${batteryLevel}%`
            : t('messages.not-initialised');
        },
        sortable: false,
      },
      {
        key: 'lastReading',
        label: 'label.last-reading',
        accessor: ({ rowData }) =>
          rowData.latestTemperatureLog?.nodes[0]?.temperature,
        sortable: false,
      },
      {
        key: 'type',
        label: 'label.sensor-type',
        accessor: ({ rowData }) => {
          const serial = rowData.serial;
          const serialSplit = serial.split('|');

          return serialSplit[1];
        },
        sortable: false,
      },
      {
        key: 'breach',
        label: 'label.breach',
        accessor: ({ rowData }) => {
          return rowData?.breach
            ? t(Formatter.breachTypeTranslation(rowData.breach))
            : null;
        },
        sortable: false,
      },
      {
        key: 'lastRecording',
        label: 'label.last-record',
        accessor: ({ rowData }) => {
          return rowData.latestTemperatureLog?.nodes[0]?.datetime
            ? Formatter.naiveDateTime(
                new Date(rowData.latestTemperatureLog?.nodes[0]?.datetime)
              )
            : null;
        },
        sortable: false,
      },
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  const { isOpen, entity, onClose, onOpen } = useEditModal<SensorFragment>();

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
