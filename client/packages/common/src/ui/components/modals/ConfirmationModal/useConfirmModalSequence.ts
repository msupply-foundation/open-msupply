import {
  ConfirmationModalContext,
  ConfirmationModalState,
  PartialBy,
} from '@openmsupply-client/common';
import { useContext, useEffect, useState } from 'react';

export interface ConfirmationStep
  extends PartialBy<ConfirmationModalState, 'open'> {
  condition?: () => boolean;
}

export const useConfirmModalSequence = (
  steps: ConfirmationStep[],
  finalConfirm: () => void
) => {
  const {
    setOpen,
    setTitle,
    setMessage,
    setOnConfirm,
    setOnCancel,

    // ENABLE THESE LATER IF REQUIRED (and below)
    // setIconType,
    // setInfo,
    // setButtonLabel,
    // setCancelButtonLabel,
  } = useContext(ConfirmationModalContext);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const next = () => setCurrentStepIndex(prev => prev + 1);

  useEffect(() => {
    if (currentStepIndex < 0) return;

    const nextStep = steps[currentStepIndex];
    if (!nextStep) {
      finalConfirm();
      setCurrentStepIndex(-1);
      return;
    }

    const { title, message, condition = () => true } = nextStep;

    if (!condition()) {
      next();
      return;
    }

    setTitle(title);
    setMessage(message);
    setOnConfirm(next);
    setOnCancel(() => {
      setOpen(false);
      setCurrentStepIndex(-1);
    });

    // ENABLE THESE LATER IF REQUIRED
    // setIconType(nextStep.iconType ?? 'help');
    // setInfo(nextStep.info);
    // setOnCancel(nextStep.onCancel);
    // setButtonLabel(nextStep.buttonLabel);
    // setCancelButtonLabel(nextStep.cancelButtonLabel);

    setTimeout(() => setOpen(true), 50); // Delay to ensure modal state has updated before re-opening
  }, [currentStepIndex]);

  return next;
};
