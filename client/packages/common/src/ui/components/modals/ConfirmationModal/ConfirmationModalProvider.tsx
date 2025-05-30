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
    info: '',
    title: '',
    iconType: 'help',
    buttonLabel: '',
  });
  const {
    open,
    message,
    info,
    buttonLabel,
    cancelButtonLabel,
    title,
    iconType,
    onConfirm,
    onCancel,
    cleanupConfirm,
  } = confirmationModalState;

  const confirmationModalController: ConfirmationModalControllerState = useMemo(
    () => ({
      setMessage: (message: string) =>
        setState(state => ({ ...state, message })),
      setInfo: (info: string | undefined) =>
        setState(state => ({ ...state, info })),
      setTitle: (title: string) => setState(state => ({ ...state, title })),
      setIconType: (iconType: IconType) =>
        setState(state => ({ ...state, iconType })),
      setButtonLabel: (buttonLabel: string | undefined) =>
        setState(state => ({ ...state, buttonLabel })),
      setCancelButtonLabel: (cancelButtonLabel: string | undefined) =>
        setState(state => ({ ...state, cancelButtonLabel })),
      setOnConfirm: (
        onConfirm:
          | ((state: ConfirmationModalState) => Promise<void>)
          | ((state: ConfirmationModalState) => void)
          | undefined
      ) => setState(state => ({ ...state, onConfirm })),
      setOnCancel: (
        onCancel: (() => Promise<void>) | (() => void) | undefined
      ) => setState(state => ({ ...state, onCancel })),
      setOpen: (open: boolean) => setState(state => ({ ...state, open })),
      setCleanupConfirm: (cleanupConfirm: (() => void) | undefined) =>
        setState(state => ({ ...state, cleanupConfirm })),
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
        info={info}
        title={title}
        onConfirm={async () => {
          onConfirm && (await onConfirm(confirmationModalState));
          cleanupConfirm
            ? cleanupConfirm()
            : setState(state => ({ ...state, open: false }));
        }}
        onCancel={() => {
          setState(state => ({ ...state, open: false }));
          onCancel && onCancel();
        }}
        iconType={iconType}
        buttonLabel={buttonLabel}
        cancelButtonLabel={cancelButtonLabel}
      />
    </ConfirmationModalContext.Provider>
  );
};
