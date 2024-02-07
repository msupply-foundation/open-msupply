import React, { useContext, useEffect } from 'react';
import { ConfirmationModalContext } from './ConfirmationModal';

export interface OkKeyBindingsProps {
  onOk?: () => void;
  okDisabled?: boolean;
  onNext?: () => void;
  nextDisabled?: boolean;
}
/**
 * Adds a key down event listener to the current window
 * - [Enter] calls the onNext callback
 * - key combination of [CTRL+Enter] calls the onOk callback
 *
 * If onNext is not provided, the onOk callback is called on [Enter]
 */
export function OkKeyBindings({
  nextDisabled,
  okDisabled,
  onNext,
  onOk,
}: OkKeyBindingsProps) {
  const { open: confirmationModalOpen } = useContext(ConfirmationModalContext);

  useEffect(() => {
    const keybindings = (e: KeyboardEvent) => {
      // TODO: this isn't working because open is set to false before keybindings is called (but we can't useCapture bc we need cancel buttons to run first!)
      // if confirmation modal is open, do not call any callbacks
      if (confirmationModalOpen) return;
      if (e.key === 'Enter') {
        // if there is no onNext callback
        if (!onNext) {
          // and there is an onOk callback, onOk is called on Enter
          if (!!onOk && !okDisabled) {
            e.preventDefault();
            onOk();
          }
          // if there is an onNext callback, the onOk callback (if present) is called on [CTRL+Enter]
        } else {
          if (e.ctrlKey && !!onOk && !okDisabled) {
            e.preventDefault();
            onOk();
            // and the onNext callback is called on Enter
          } else if (!nextDisabled) {
            e.preventDefault();
            onNext();
          }
        }
      }
    };

    window.addEventListener('keydown', keybindings);
    return () => window.removeEventListener('keydown', keybindings);
  }, [onNext, onOk, nextDisabled, okDisabled, confirmationModalOpen]);

  return <></>;
}
