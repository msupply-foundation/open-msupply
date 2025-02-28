import { useEffect } from 'react';

interface UseKeyboardShortcutArgs {
  isKeyValid: (e: globalThis.KeyboardEvent) => boolean;
  onKeyPressed: () => void;
}

export const useKeyboardShortcut = ({
  isKeyValid,
  onKeyPressed,
}: UseKeyboardShortcutArgs) => {
  useEffect(() => {
    function keyDownHandler(e: globalThis.KeyboardEvent) {
      if (isKeyValid(e)) {
        e.preventDefault();
        onKeyPressed();
      }
    }

    document.addEventListener('keydown', keyDownHandler);

    return () => {
      document.removeEventListener('keydown', keyDownHandler);
    };
  }, []);
};
