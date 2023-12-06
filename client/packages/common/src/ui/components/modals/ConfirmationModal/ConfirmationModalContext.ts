import { createRegisteredContext } from 'react-singleton-context';

export type IconType = 'alert' | 'help' | 'info';
export interface ConfirmationModalState {
  open: boolean;
  message: string;
  title: string;
  iconType?: IconType;
  onConfirm?: (() => void) | (() => Promise<void>);
  onCancel?: (() => void) | (() => Promise<void>);
}

export interface ConfirmationModalControllerState
  extends ConfirmationModalState {
  setState: (state: ConfirmationModalState) => void;
  setIconType: (iconType: IconType) => void;
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
  createRegisteredContext<ConfirmationModalControllerState>(
    'confirmation-modal-provider',
    {} as any
  );
