import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const useKeyboardIsOpen = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!Capacitor.isPluginAvailable('Keyboard')) return;

    Keyboard.addListener('keyboardDidShow', () => {
      setOpen(true);
    });
    Keyboard.addListener('keyboardDidHide', () => {
      setOpen(false);
    });

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  return open;
};
