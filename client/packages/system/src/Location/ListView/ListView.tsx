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
  UNDEFINED_STRING_VALUE,
  InlineProgress,
  Box,
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
      {
        key: 'name',
        label: 'label.name',
      },
      {
        key: 'locationType',
        label: 'label.location-type',
        accessor: ({ rowData: { locationType } }) =>
          locationType
            ? t('label.location-temperature-range', {
                locationName: locationType.name,
                minTemperature: locationType.minTemperature,
                maxTemperature: locationType.maxTemperature,
              })
            : null,
        sortable: false,
      },
      {
        key: 'volume',
        label: 'label.volume',
        sortable: false,
      },
      {
        key: 'volumeUsed',
        label: 'label.volume-used',
        sortable: false,
        Cell: ({ rowData: { volume, volumeUsed } }) => {
          if (!volume) return UNDEFINED_STRING_VALUE;

          return (
            <Box sx={{ width: '150px' }}>
              <InlineProgress
                variant="determinate"
                color="secondary"
                value={((volumeUsed || 0) / volume) * 100}
              />
            </Box>
          );
        },
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
