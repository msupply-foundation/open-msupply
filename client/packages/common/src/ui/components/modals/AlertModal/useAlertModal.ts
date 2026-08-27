import { useContext, useCallback } from 'react';
import { PartialBy } from '@common/types';
import { AlertModalContext, AlertModalState } from './AlertModalContext';

export const useAlertModal = ({
  onOk = () => {},
  message,
  title,
}: PartialBy<AlertModalState, 'open'>) => {
  const { setOnOk, setMessage, setTitle, setOpen } =
    useContext(AlertModalContext);

  const trigger = (
    paramPatch?: Partial<PartialBy<AlertModalState, 'open'>>
  ) => {
    onOk && setOnOk(paramPatch?.onOk ?? onOk);
    setMessage(paramPatch?.message ?? message);
    setTitle(paramPatch?.title ?? title);
    setOpen(true);
  };

  return useCallback(trigger, [
    message,
    title,
    setOnOk,
    setMessage,
    setTitle,
    setOpen,
  ]);
};
