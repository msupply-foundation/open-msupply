import { createContext } from 'react';

export interface ConfirmationModalState {
  open: boolean;
  message: string;
  title: string;
  iconType?: 'alert' | 'info';
  onConfirm?: (() => void) | (() => Promise<void>);
  onCancel?: (() => void) | (() => Promise<void>);
}

export interface ConfirmationModalControllerState
  extends ConfirmationModalState {
  setState: (state: ConfirmationModalState) => void;
  setMessage: (message: string) => void;
  setTitle: (title: string) => void;
  setOnConfirm: (
    onConfirm: (() => Promise<void>) | (() => void) | undefined
  ) => void;
  setOnCancel: (
    onCancel: (() => Promise<void>) | (() => void) | undefined
  ) => void;
  setOpen: (open: boolean) => void;
}

export const ConfirmationModalContext =
  createContext<ConfirmationModalControllerState>({} as any);
