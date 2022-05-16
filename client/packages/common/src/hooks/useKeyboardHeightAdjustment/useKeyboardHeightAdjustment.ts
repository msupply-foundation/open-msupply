import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';

export const useKeyboardHeightAdjustment = (initialHeight: number) => {
  const [height, setHeight] = useState(initialHeight);

  useEffect(() => {
    Keyboard.addListener('keyboardDidShow', info => {
      setHeight(700 - info.keyboardHeight);
    });
    Keyboard.addListener('keyboardDidHide', () => {
      setHeight(700);
    });

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);

  return height;
};
