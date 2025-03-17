import { useContext, useCallback } from 'react';
import { SyncModalContext } from './SyncModalContext';

export const useSyncModal = () => {
  const { setOpen } = useContext(SyncModalContext);

  const trigger = () => {
    setOpen(true);
  };

  return useCallback(trigger, [setOpen]);
};
