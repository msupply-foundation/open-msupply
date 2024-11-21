import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useEditModal,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useLocation, LocationRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { LocationEditModal } from './LocationEditModal';
import { Toolbar } from './Toolbar';

const LocationListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [
      {
        key: 'name',
      },
      {
        key: 'onHold',
        condition: '=',
      },
    ],
  });
  const queryParams = { sortBy, first, offset, filterBy };
  const { data, isError, isLoading } = useLocation.document.list(queryParams);
  const pagination = { page, first, offset };
  const t = useTranslation();
  const columns = useColumns<LocationRowFragment>(
    [
      'code',
      'name',
      {
        key: 'coldStorageType',
        label: 'label.storage-type',
        accessor: ({ rowData: { coldStorageType } }) =>
          coldStorageType
            ? `${coldStorageType.name} (${coldStorageType.minTemperature}°C to ${coldStorageType.maxTemperature}°C)`
            : null,
        width: 200,
        sortable: false,
      },
      'selection',
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );
  const { isOpen, entity, mode, onClose, onOpen } =
    useEditModal<LocationRowFragment>();
  const locations = data?.nodes ?? [];

  return (
    <>
      {isOpen && (
        <LocationEditModal
          mode={mode}
          isOpen={isOpen}
          onClose={onClose}
          location={entity}
        />
      )}
      <Toolbar data={locations} filter={filter} />
      <AppBarButtons onCreate={() => onOpen()} />
      <DataTable
        id="location-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={locations}
        isError={isError}
        isLoading={isLoading}
        onRowClick={onOpen}
        noDataElement={
          <NothingHere
            body={t('error.no-locations')}
            onCreate={() => onOpen()}
          />
        }
      />
    </>
  );
};

export const LocationListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <LocationListComponent />
  </TableProvider>
);
