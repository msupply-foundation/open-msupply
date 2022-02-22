import React, { FC, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useToggle,
  ModalMode,
} from '@openmsupply-client/common';
import { useLocationList } from './api';
import { AppBarButtons } from './AppBarButtons';
import { LocationEditModal } from './LocationEditModal';
import { Location } from '../types';
import { Toolbar } from './Toolbar';
interface EditModalState<T> {
  entity: T | null;
  mode: ModalMode | null;
  onOpen: (entity?: T | null) => void;
  onClose: () => void;
  isOpen: boolean;
}

function useEditModal<T>(): EditModalState<T> {
  const modalControl = useToggle(false);
  const [entity, setEntity] = useState<T | null>(null);
  const [mode, setMode] = useState<ModalMode | null>(null);

  const onOpen = (entity: T | null = null) => {
    setEntity(entity);
    setMode(entity ? ModalMode.Update : ModalMode.Create);
    modalControl.toggleOn();
  };

  const onClose = () => {
    setMode(null);
    setEntity(null);
    modalControl.toggleOff();
  };

  return {
    onOpen,
    onClose,
    entity,
    mode,
    isOpen: modalControl.isOn,
  };
}

export const LocationListView: FC = () => {
  const {
    pagination,
    onChangePage,
    data,
    isLoading,
    onChangeSortBy,
    sortBy,
    filter,
  } = useLocationList();

  const columns = useColumns<Location>(
    ['code', 'name', 'selection'],
    {
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
  );
  const { isOpen, entity, mode, onClose, onOpen } = useEditModal<Location>();
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
        isLoading={isLoading}
        onRowClick={onOpen}
      />
    </TableProvider>
  );
};
