import React, { useEffect } from 'react';

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
  useEffect(() => {
    const keybindings = (e: KeyboardEvent) => {
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
  }, [onNext, onOk, nextDisabled, okDisabled]);

  return <></>;
}
