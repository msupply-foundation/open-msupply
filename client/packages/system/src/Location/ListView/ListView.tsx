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
  GenericColumnKey,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocationList } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { LocationEditModal } from './LocationEditModal';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';

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
  const {
    query: { data, isError, isLoading },
  } = useLocationList(queryParams);
  const pagination = { page, first, offset };
  const t = useTranslation();
  const columns = useColumns<LocationRowFragment>(
    [
      GenericColumnKey.Selection,
      'code',
      'name',
      {
        key: 'coldStorageType',
        label: 'label.cold-storage-type',
        accessor: ({ rowData: { coldStorageType } }) =>
          coldStorageType
            ? t('label.cold-storage-temperature-range', {
                coldStorageName: coldStorageType.name,
                minTemperature: coldStorageType.minTemperature,
                maxTemperature: coldStorageType.maxTemperature,
              })
            : null,
        width: 200,
        sortable: false,
      },
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
      <Toolbar filter={filter} />
      <AppBarButtons
        onCreate={() => onOpen()}
        locations={data?.nodes}
        reportIsLoading={isLoading}
      />
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
      <Footer data={locations} />
    </>
  );
};

export const LocationListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <LocationListComponent />
  </TableProvider>
);
