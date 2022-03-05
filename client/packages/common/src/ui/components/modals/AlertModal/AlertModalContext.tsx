import { createContext } from 'react';

export interface AlertModalState {
  open: boolean;
  message: string;
  title: string;
  iconType?: 'alert';
  onOk?: () => void;
}

export interface AlertModalControllerState extends AlertModalState {
  setState: (state: AlertModalState) => void;
  setOpen: (open: boolean) => void;
  setMessage: (message: string) => void;
  setTitle: (title: string) => void;
  setOnOk: (onOk: () => void) => void;
}

export const AlertModalContext = createContext<AlertModalControllerState>({
  open: false,
  message: '',
  title: '',
  setOpen: () => {},
  setState: () => {},
  setMessage: () => {},
  setTitle: () => {},
  setOnOk: () => {},
});
