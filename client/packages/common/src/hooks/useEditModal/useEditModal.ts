import { useState } from 'react';
import { useToggle } from '../useToggle';

export enum ModalMode {
  Create,
  Update,
}

interface EditModalState<T> {
  entity: T | null;
  mode: ModalMode | null;
  setMode: (mode: ModalMode) => void;
  onOpen: (entity?: T | null) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const useEditModal = <T>(): EditModalState<T> => {
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
    setMode,
    isOpen: modalControl.isOn,
  };
};
