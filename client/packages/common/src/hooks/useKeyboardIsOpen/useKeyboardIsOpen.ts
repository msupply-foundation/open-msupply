import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const useKeyboardIsOpen = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!Capacitor.isPluginAvailable('Keyboard')) return;

      const showListener = await Keyboard.addListener('keyboardDidShow', () => {
        setOpen(true);
      });
      const hideListener = await Keyboard.addListener('keyboardDidHide', () => {
        setOpen(false);
      });

      return () => {
        showListener.remove();
        hideListener.remove();
      };
    })();
  }, []);

  return open;
};
