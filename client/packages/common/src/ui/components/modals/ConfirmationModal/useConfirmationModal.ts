import { useContext, useCallback } from 'react';
import { PartialBy } from '@common/types';
import {
  ConfirmationModalContext,
  ConfirmationModalState,
} from './ConfirmationModalContext';

export const useConfirmationModal = ({
  onConfirm,
  message,
  info,
  buttonLabel,
  cancelButtonLabel,
  title,
  onCancel,
  iconType = 'help',
}: PartialBy<ConfirmationModalState, 'open'>) => {
  const {
    setIconType,
    setOpen,
    setMessage,
    setInfo,
    setOnConfirm,
    setOnCancel,
    setTitle,
    setButtonLabel,
    setCancelButtonLabel,
  } = useContext(ConfirmationModalContext);

  const trigger = (
    paramPatch?: Partial<PartialBy<ConfirmationModalState, 'open'>>
  ) => {
    setMessage(paramPatch?.message ?? message);
    setInfo(paramPatch?.info ?? info);
    setOnConfirm(paramPatch?.onConfirm ?? onConfirm);
    setTitle(paramPatch?.title ?? title);
    setOnCancel(paramPatch?.onCancel ?? onCancel);
    setIconType(iconType);
    setButtonLabel(paramPatch?.buttonLabel ?? buttonLabel);
    setCancelButtonLabel(paramPatch?.cancelButtonLabel ?? cancelButtonLabel);
    setOpen(true);
  };

  return useCallback(trigger, [
    message,
    onConfirm,
    title,
    setMessage,
    setInfo,
    setOnConfirm,
    setTitle,
    setOpen,
    iconType,
    buttonLabel,
    cancelButtonLabel,
  ]);
};
