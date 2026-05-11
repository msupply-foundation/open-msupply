/**
 * A hook to manage a sequence of confirmation modals.
 *
 * Handling these individually using our `useConfirmationModal` hook is very
 * messy when there's 2 or more confirmations that must be handled before an
 * action. This hook simplified it into a simple sequence of steps.
 *
 * Each step can optionally have a `condition` function that returns a boolean
 * to determine whether that step should be shown or skipped. Other than that
 * the input properties for each step are the same as for the standalone
 * confirmation modal.
 *
 * The "Action" to be performed after all steps are confirmed should be passed
 * in as the second parameter (`finalConfirm`).
 */

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
    setIconType,
    setInfo,
    setButtonLabel,
    setCancelButtonLabel,
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

    const {
      title,
      message,
      buttonLabel,
      cancelButtonLabel,
      iconType = 'help',
      info,
      condition = () => true,
    } = nextStep;

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
    setIconType(iconType);
    setInfo(info);
    setButtonLabel(buttonLabel);
    setCancelButtonLabel(cancelButtonLabel);

    setTimeout(() => setOpen(true), 50); // Delay to ensure modal state has updated before re-opening
  }, [currentStepIndex]);

  return next;
};
