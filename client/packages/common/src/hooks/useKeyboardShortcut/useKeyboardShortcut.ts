import { useEffect } from 'react';

interface props {
  key: string;
  handler: () => void;
}

export const useKeyboardShortcut = ({ key, handler }: props) => {
  useEffect(() => {
    function handleKeyDown(this: HTMLElement, ev: KeyboardEvent) {
      if (ev.key === key) {
        handler();
      }
    }

    document.body.addEventListener('keydown', handleKeyDown);
    return () => document.body.removeEventListener('keydown', handleKeyDown);
  }, []);
};
