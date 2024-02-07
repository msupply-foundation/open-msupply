import React, { useEffect } from 'react';

interface OkKeybindingsProps {
  onOk: () => void;
  onNext: () => void; // TODO: needs to be optional?
  okDisabled: boolean;
  nextDisabled: boolean;
}

// adds a key down event listener to the current window
// - key combination of [CTRL+Enter] calls the onNext callback
// - key combination of [CTRL+Shift+Enter] calls the onOk callback
export function OkKeybindings({
  nextDisabled,
  okDisabled,
  onNext,
  onOk,
}: OkKeybindingsProps) {
  useEffect(() => {
    const keybindings = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        if (!okDisabled && e.shiftKey) {
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
