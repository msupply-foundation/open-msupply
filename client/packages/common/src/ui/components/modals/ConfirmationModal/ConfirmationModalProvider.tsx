import React, {
  FC,
  useCallback,
  useMemo,
  useContext,
  useState,
  createContext,
} from 'react';
import { ConfirmationModal } from './ConfirmationModal';

interface ConfirmationModalState {
  open: boolean;
  message: string;
  title: string;
  iconType?: 'alert' | 'info';
  onConfirm?: (() => void) | (() => Promise<void>);
  onCancel?: (() => void) | (() => Promise<void>);
}

interface ConfirmationModalControllerState extends ConfirmationModalState {
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

const Context = createContext<ConfirmationModalControllerState>({
  open: false,
  message: '',
  title: '',
  iconType: 'info',
  onConfirm: () => {},
  setState: () => {},
  setMessage: () => {},
  setTitle: () => {},
  setOnConfirm: () => {},
  setOnCancel: () => {},
  setOpen: () => {},
});

export const ConfirmationModalProvider: FC = ({ children }) => {
  const [confirmationModalState, setState] = useState<ConfirmationModalState>({
    open: false,
    message: '',
    title: '',
    iconType: 'info',
  });
  const { open, message, title, iconType, onConfirm, onCancel } =
    confirmationModalState;

  const confirmationModalController: ConfirmationModalControllerState = useMemo(
    () => ({
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
    <Context.Provider value={confirmationModalController}>
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
    </Context.Provider>
  );
};

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const useConfirmationModal = ({
  onConfirm,
  message,
  title,
  onCancel,
}: PartialBy<ConfirmationModalState, 'open'>) => {
  const { setOpen, setMessage, setOnConfirm, setOnCancel, setTitle } =
    useContext(Context);

  const trigger = (
    paramPatch?: Partial<PartialBy<ConfirmationModalState, 'open'>>
  ) => {
    setMessage(paramPatch?.message ?? message);
    setOnConfirm(paramPatch?.onConfirm ?? onConfirm);
    setTitle(paramPatch?.title ?? title);
    setOnCancel(paramPatch?.onCancel ?? onCancel);
    setOpen(true);
  };

  return useCallback(trigger, [
    message,
    onConfirm,
    title,
    setMessage,
    setOnConfirm,
    setTitle,
    setOpen,
  ]);
};
