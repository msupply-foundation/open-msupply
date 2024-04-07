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
  iconType = 'help',
}: PartialBy<ConfirmationModalState, 'open'>) => {
  const {
    setIconType,
    setOpen,
    setMessage,
    setOnConfirm,
    setOnCancel,
    setTitle,
  } = useContext(ConfirmationModalContext);

  const trigger = (
    paramPatch?: Partial<PartialBy<ConfirmationModalState, 'open'>>
  ) => {
    setMessage(paramPatch?.message ?? message);
    setOnConfirm(paramPatch?.onConfirm ?? onConfirm);
    setTitle(paramPatch?.title ?? title);
    setOnCancel(paramPatch?.onCancel ?? onCancel);
    setIconType(iconType);
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
    iconType,
  ]);
};
