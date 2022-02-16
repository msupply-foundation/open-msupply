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
  onConfirm: (() => void) | (() => Promise<void>);
}

interface ConfirmationModalControllerState extends ConfirmationModalState {
  setState: (state: ConfirmationModalState) => void;
  setMessage: (message: string) => void;
  setTitle: (title: string) => void;
  setOnConfirm: (onConfirm: (() => Promise<void>) | (() => void)) => void;
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
  setOpen: () => {},
});

export const ConfirmationModalProvider: FC = ({ children }) => {
  const [confirmationModalState, setState] = useState<ConfirmationModalState>({
    open: false,
    message: '',
    title: '',
    iconType: 'info',
    onConfirm: async () => {},
  });
  const { open, message, title, iconType, onConfirm } = confirmationModalState;

  const confirmationModalController: ConfirmationModalControllerState = useMemo(
    () => ({
      setMessage: (message: string) =>
        setState(state => ({ ...state, message })),
      setTitle: (title: string) => setState(state => ({ ...state, title })),
      setOnConfirm: (onConfirm: (() => Promise<void>) | (() => void)) =>
        setState(state => ({ ...state, onConfirm })),
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
        onCancel={() => setState(state => ({ ...state, open: false }))}
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
}: PartialBy<ConfirmationModalState, 'open'>) => {
  const { setOpen, setMessage, setOnConfirm, setTitle } = useContext(Context);

  const trigger = () => {
    setMessage(message);
    setOnConfirm(onConfirm);
    setTitle(title);
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
