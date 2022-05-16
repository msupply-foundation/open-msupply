import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const useKeyboardHeightAdjustment = (initialHeight: number) => {
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    if (!Capacitor.isPluginAvailable('Keyboard')) return;

    Keyboard.addListener('keyboardDidShow', info => {
      setHeight(initialHeight - info.keyboardHeight);
    });
    Keyboard.addListener('keyboardDidHide', () => {
      setHeight(initialHeight);
    });

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  return height;
};
