import React, { useContext, useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';
import { createRegisteredContext } from 'react-singleton-context';

interface KeyboardControl {
  isOpen: boolean;
  isEnabled: boolean;
}

const defaultKeyboardControl: KeyboardControl = {
  isOpen: false,
  isEnabled: false,
};

const KeyboardContext = createRegisteredContext<KeyboardControl>(
  'keyboard-context',
  defaultKeyboardControl
);

const { Provider } = KeyboardContext;

export const KeyboardProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setOpen] = useState(false);
  const isEnabled = Capacitor.isPluginAvailable('Keyboard');

  useEffect(() => {
    (async () => {
      if (!isEnabled) return;

      const showListener = await Keyboard.addListener('keyboardDidShow', () =>
        setOpen(true)
      );
      const hideListener = await Keyboard.addListener('keyboardDidHide', () =>
        setOpen(false)
      );

      return () => {
        showListener.remove();
        hideListener.remove();
      };
    })();
  }, []);

  return (
    <Provider
      value={{
        isOpen,
        isEnabled,
      }}
    >
      {children}
    </Provider>
  );
};

export const useKeyboardContext = () => {
  const keyboardControl = useContext(KeyboardContext);
  return keyboardControl;
};
