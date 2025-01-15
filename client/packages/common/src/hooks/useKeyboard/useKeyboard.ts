import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const useKeyboard = () => {
  const [isOpen, setOpen] = useState(false);
  const isEnabled = Capacitor.isPluginAvailable('Keyboard');

  useEffect(() => {
    (async () => {
      if (!isEnabled) return;

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

  return {
    isOpen,
    isEnabled,
  };
};
