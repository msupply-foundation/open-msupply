import React from 'react';
import { createRegisteredContext } from 'react-singleton-context';

export interface AlertModalState {
  open: boolean;
  message: string | React.ReactNode;
  title: string;
  iconType?: 'alert';
  onOk?: () => void;
  important?: boolean;
}

export interface AlertModalControllerState extends AlertModalState {
  setState: (state: AlertModalState) => void;
  setOpen: (open: boolean) => void;
  setMessage: (message: string | React.ReactNode) => void;
  setTitle: (title: string) => void;
  setOnOk: (onOk: () => void) => void;
  setImportant: (important: boolean) => void;
}

export const AlertModalContext =
  createRegisteredContext<AlertModalControllerState>(
    'alert-modal-context',
    {} as any
  );
