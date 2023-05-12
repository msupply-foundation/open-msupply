import { useEffect } from 'react';

interface props {
  key: string;
  handler: () => void;
  dependencies?: any[];
}

export const useKeyboardShortcut = ({ key, handler, dependencies }: props) => {
  useEffect(() => {
    function handleKeyDown(this: HTMLElement, ev: KeyboardEvent) {
      console.log(ev);
      if (ev.ctrlKey && ev.key === key) {
        handler();
      }
    }

    document.body.addEventListener('keydown', handleKeyDown);
    return () => document.body.removeEventListener('keydown', handleKeyDown);
  }, dependencies);
};
