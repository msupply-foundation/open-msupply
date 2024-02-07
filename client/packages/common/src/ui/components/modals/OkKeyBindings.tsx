import React, { useEffect } from 'react';

interface OkKeyBindingsProps {
  onOk: () => void;
  onNext: () => void;
  okDisabled: boolean;
  nextDisabled: boolean;
}

// adds a key down event listener to the current window
// - [Enter] calls the onNext callback
// - key combination of [CTRL+Enter] calls the onOk callback
export function OkKeyBindings({
  nextDisabled,
  okDisabled,
  onNext,
  onOk,
}: OkKeyBindingsProps) {
  useEffect(() => {
    const keybindings = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.ctrlKey && !okDisabled) {
          e.preventDefault();
          onOk();
        } else if (!nextDisabled) {
          e.preventDefault();
          onNext();
        }
      }
    };

    window.addEventListener('keydown', keybindings);
    return () => window.removeEventListener('keydown', keybindings);
  }, [onNext, onOk, nextDisabled, okDisabled]);

  return <></>;
}
