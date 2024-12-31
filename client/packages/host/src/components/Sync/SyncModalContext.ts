import { createContext } from 'react';

export interface SyncModalState {
  open: boolean;
}

export interface SyncModalControllerState extends SyncModalState {
  setState: (state: SyncModalState) => void;
  setOpen: (open: boolean) => void;
}

export const SyncModalContext = createContext<SyncModalControllerState>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  {} as any
);
