import React, { FC, useMemo, useState } from 'react';
import {
  EasterEggModalContext,
  EasterEggModalState,
  EasterEggModalControllerState,
} from './EasterEggModalContext';
import { EasterEggModal } from './EasterEggModal';
import { PropsWithChildrenOnly } from '@common/types';

export const EasterEggModalProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const [confirmationModalState, setState] = useState<EasterEggModalState>({
    open: false,
  });
  const { open } = confirmationModalState;

  const easterEggModalController: EasterEggModalControllerState = useMemo(
    () => ({
      setOpen: (open: boolean) => setState(state => ({ ...state, open })),
      setState,
      ...confirmationModalState,
    }),
    [setState, confirmationModalState]
  );

  return (
    <EasterEggModalContext.Provider value={easterEggModalController}>
      {children}
      <EasterEggModal
        open={open}
        onCancel={() => {
          setState(state => ({ ...state, open: false }));
        }}
      />
    </EasterEggModalContext.Provider>
  );
};
