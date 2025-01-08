import React, { FC, useMemo, useState } from 'react';
import {
  SyncModalContext,
  SyncModalState,
  SyncModalControllerState,
} from './SyncModalContext';
import { SyncModal } from './SyncModal';
import { PropsWithChildrenOnly } from '@common/types';

export const SyncModalProvider: FC<PropsWithChildrenOnly> = ({ children }) => {
  const [syncModalState, setState] = useState<SyncModalState>({
    open: false,
  });
  const { open } = syncModalState;

  const syncModalController: SyncModalControllerState = useMemo(
    () => ({
      setOpen: (open: boolean) => setState(state => ({ ...state, open })),
      setState,
      ...syncModalState,
    }),
    [setState, syncModalState]
  );

  return (
    <SyncModalContext.Provider value={syncModalController}>
      {children}
      <SyncModal
        open={open}
        onCancel={() => {
          setState(state => ({ ...state, open: false }));
        }}
      />
    </SyncModalContext.Provider>
  );
};
