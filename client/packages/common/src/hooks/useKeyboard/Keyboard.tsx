import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { create } from 'zustand';

interface KeyboardControl {
  isOpen: boolean;
  isEnabled: boolean;
}

export const useKeyboard = create<KeyboardControl>(set => {
  const isEnabled = Capacitor.isPluginAvailable('Keyboard');

  if (isEnabled) {
    Keyboard.addListener('keyboardDidShow', () =>
      set({ isEnabled, isOpen: true })
    );

    Keyboard.addListener('keyboardDidHide', () =>
      set({ isEnabled, isOpen: false })
    );
  }

  return {
    isEnabled,
    isOpen: false,
  };
});
