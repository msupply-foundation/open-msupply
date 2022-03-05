import React, { FC, useState, useMemo } from 'react';
import {
  AlertModalContext,
  AlertModalControllerState,
  AlertModalState,
} from './AlertModalContext';
import { AlertModal } from './AlertModal';

export const AlertModalProvider: FC = ({ children }) => {
  const [alertModalState, setState] = useState<AlertModalState>({
    open: false,
    message: '',
    title: '',
    iconType: 'alert',
  });
  const { open, message, title, onOk } = alertModalState;

  const alertModalController: AlertModalControllerState = useMemo(
    () => ({
      setState,
      setMessage: (message: string) =>
        setState(state => ({ ...state, message })),
      setTitle: (title: string) => setState(state => ({ ...state, title })),
      setOnOk: () => {},
      setOpen: (open: boolean) => setState(state => ({ ...state, open })),
      ...alertModalState,
    }),
    [setState, alertModalState]
  );

  return (
    <AlertModalContext.Provider value={alertModalController}>
      {children}
      <AlertModal
        open={open}
        message={message}
        title={title}
        onOk={() => {
          alertModalController.setOpen(false);
          onOk && onOk();
        }}
      />
    </AlertModalContext.Provider>
  );
};
