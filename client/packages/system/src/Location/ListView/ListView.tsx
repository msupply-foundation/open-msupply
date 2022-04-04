import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useEditModal,
} from '@openmsupply-client/common';
import { useLocations, LocationRowFragment } from '../api';
import { AppBarButtons } from './AppBarButtons';
import { LocationEditModal } from './LocationEditModal';
import { Toolbar } from './Toolbar';

export const LocationListView: FC = () => {
  const {
    pagination,
    onChangePage,
    data,
    isError,
    isLoading,
    onChangeSortBy,
    sortBy,
    filter,
  } = useLocations();

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
    <TableProvider createStore={createTableStore}>
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
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={locations}
        isError={isError}
        isLoading={isLoading}
        onRowClick={onOpen}
      />
    </TableProvider>
  );
};
