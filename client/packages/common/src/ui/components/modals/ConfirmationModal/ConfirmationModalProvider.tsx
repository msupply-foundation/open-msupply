import React, { FC, useMemo, useState } from 'react';
import {
  ConfirmationModalContext,
  ConfirmationModalState,
  ConfirmationModalControllerState,
  IconType,
} from './ConfirmationModalContext';
import { ConfirmationModal } from './ConfirmationModal';
import { PropsWithChildrenOnly } from '@common/types';

export const ConfirmationModalProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const [confirmationModalState, setState] = useState<ConfirmationModalState>({
    open: false,
    message: '',
    title: '',
    iconType: 'help',
  });
  const { open, message, title, iconType, onConfirm, onCancel } =
    confirmationModalState;

  const confirmationModalController: ConfirmationModalControllerState = useMemo(
    () => ({
      setIconType: (iconType: IconType) =>
        setState(state => ({ ...state, iconType })),
      setMessage: (message: string) =>
        setState(state => ({ ...state, message })),
      setTitle: (title: string) => setState(state => ({ ...state, title })),
      setOnConfirm: (
        onConfirm: (() => Promise<void>) | (() => void) | undefined
      ) => setState(state => ({ ...state, onConfirm })),
      setOnCancel: (
        onCancel: (() => Promise<void>) | (() => void) | undefined
      ) => setState(state => ({ ...state, onCancel })),
      setOpen: (open: boolean) => setState(state => ({ ...state, open })),
      setState,
      ...confirmationModalState,
    }),
    [setState, confirmationModalState]
  );

  return (
    <ConfirmationModalContext.Provider value={confirmationModalController}>
      {children}
      <ConfirmationModal
        open={open}
        message={message}
        title={title}
        onConfirm={onConfirm}
        onCancel={() => {
          setState(state => ({ ...state, open: false }));
          onCancel && onCancel();
        }}
        iconType={iconType}
      />
    </ConfirmationModalContext.Provider>
  );
};
