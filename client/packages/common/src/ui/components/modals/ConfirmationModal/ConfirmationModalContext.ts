import { createRegisteredContext } from 'react-singleton-context';

export type IconType = 'alert' | 'help' | 'info';
export interface ConfirmationModalState {
  open: boolean;
  message: string;
  info?: string | undefined;
  title: string;
  iconType?: IconType;
  buttonLabel?: string | undefined;
  cancelButtonLabel?: string | undefined;
  onConfirm?:
    | ((state: ConfirmationModalState) => void)
    | ((state: ConfirmationModalState) => Promise<void>);
  onCancel?: (() => void) | (() => Promise<void>);
  cleanupConfirm?: () => void;
}

export interface ConfirmationModalControllerState
  extends ConfirmationModalState {
  setState: (state: ConfirmationModalState) => void;
  setIconType: (iconType: IconType) => void;
  setMessage: (message: string) => void;
  setInfo: (info: string | undefined) => void;
  setTitle: (title: string) => void;
  setButtonLabel: (buttonLabel: string | undefined) => void;
  setCancelButtonLabel: (cancelButtonLabel: string | undefined) => void;
  setOnConfirm: (
    onConfirm:
      | ((state: ConfirmationModalState) => Promise<void>)
      | ((state: ConfirmationModalState) => void)
      | undefined
  ) => void;
  setOnCancel: (
    onCancel: (() => Promise<void>) | (() => void) | undefined
  ) => void;
  setOpen: (open: boolean) => void;
  setCleanupConfirm: (cleanupConfirm: (() => void) | undefined) => void;
}

export const ConfirmationModalContext =
  createRegisteredContext<ConfirmationModalControllerState>(
    'confirmation-modal-provider',
    {} as any
  );
