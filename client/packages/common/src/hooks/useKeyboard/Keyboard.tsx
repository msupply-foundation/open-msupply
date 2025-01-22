import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { create } from 'zustand';

interface KeyboardControl {
  keyboardIsOpen: boolean;
  keyboardIsEnabled: boolean;
}

export const useKeyboard = create<KeyboardControl>(set => {
  const keyboardIsEnabled = Capacitor.isPluginAvailable('Keyboard');

  if (keyboardIsEnabled) {
    Keyboard.addListener('keyboardDidShow', () =>
      set({ keyboardIsEnabled, keyboardIsOpen: true })
    );

    Keyboard.addListener('keyboardDidHide', () =>
      set({ keyboardIsEnabled, keyboardIsOpen: false })
    );
  }

  return {
    keyboardIsEnabled,
    keyboardIsOpen: false,
  };
});
