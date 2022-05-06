import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useEditModal,
  NothingHere,
  useTranslation,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { useLocations, LocationRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { LocationEditModal } from './LocationEditModal';
import { Toolbar } from './Toolbar';

const LocationListComponent: FC = () => {
  const { pagination, data, isError, isLoading, sort, filter } = useLocations();
  const { sortBy, onChangeSortBy } = sort;
  const t = useTranslation('inventory');
  const columns = useColumns<LocationRowFragment>(
    ['code', 'name', 'selection'],
    {
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
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
      <AppBarButtons onCreate={() => onOpen()} sortBy={sortBy} />
      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={pagination.onChangePage}
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
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<LocationRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <LocationListComponent />
  </TableProvider>
);
