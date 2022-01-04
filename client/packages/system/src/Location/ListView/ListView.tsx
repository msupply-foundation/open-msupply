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

interface EditModalState<T> {
  entity: T | null;
  mode: ModalMode | null;
  onOpen: (entity?: T | null) => void;
  onClose: () => void;
  isOpen: boolean;
}

const useEditModal = <T extends unknown>(): EditModalState<T> => {
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
};

export const LocationListView: FC = () => {
  const { pagination, onChangePage, data, isLoading, onChangeSortBy, sortBy } =
    useLocationList();

  const columns = useColumns<Location>(
    ['code', 'name'],
    {
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
  );
  const { isOpen, entity, mode, onClose, onOpen } = useEditModal<Location>();

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
      <AppBarButtons onCreate={() => onOpen()} />
      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={onOpen}
      />
    </TableProvider>
  );
};
