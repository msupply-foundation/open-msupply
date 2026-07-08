import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { create } from 'zustand';

interface KeyboardControl {
  keyboardIsOpen: boolean;
  keyboardIsEnabled: boolean;
  // Soft keyboard height in px (0 when closed); used to reserve scroll space
  // below the focused input so it can be lifted above the keyboard.
  keyboardHeight: number;
}

export const useKeyboard = create<KeyboardControl>(set => {
  const keyboardIsEnabled = Capacitor.isPluginAvailable('Keyboard');

  if (keyboardIsEnabled) {
    Keyboard.addListener('keyboardDidShow', info =>
      set({
        keyboardIsEnabled,
        keyboardIsOpen: true,
        keyboardHeight: info.keyboardHeight,
      })
    );

    Keyboard.addListener('keyboardDidHide', () =>
      set({ keyboardIsEnabled, keyboardIsOpen: false, keyboardHeight: 0 })
    );
  }

  return {
    keyboardIsEnabled,
    keyboardIsOpen: false,
    keyboardHeight: 0,
  };
});
