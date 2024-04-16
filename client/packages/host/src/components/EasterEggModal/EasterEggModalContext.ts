import { createContext } from 'react';

export interface EasterEggModalState {
  open: boolean;
}

export interface EasterEggModalControllerState extends EasterEggModalState {
  setState: (state: EasterEggModalState) => void;
  setOpen: (open: boolean) => void;
}

export const EasterEggModalContext =
  createContext<EasterEggModalControllerState>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any
  );
