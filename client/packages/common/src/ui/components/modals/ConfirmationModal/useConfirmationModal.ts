import { useContext, useCallback } from 'react';
import { PartialBy } from '@common/types';
import {
  ConfirmationModalContext,
  ConfirmationModalState,
} from './ConfirmationModalContext';

export const useConfirmationModal = ({
  onConfirm,
  message,
  title,
  onCancel,
}: PartialBy<ConfirmationModalState, 'open'>) => {
  const { setOpen, setMessage, setOnConfirm, setOnCancel, setTitle } =
    useContext(ConfirmationModalContext);

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
