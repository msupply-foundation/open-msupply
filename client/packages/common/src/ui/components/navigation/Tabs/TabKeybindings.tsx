import React, { useEffect } from 'react';

interface TabKeybindingsProps<T> {
  tabs: T[];
  onAdd?: () => void;
  setCurrentTab: React.Dispatch<React.SetStateAction<T>>;
  dependencies?: any[];
}

// adds a key down event listener to the current window
// and will check for the key combination of CTRL+[number]
// and navigate to that tab, according to the order in the
// tabs parameter
// An optional `onAdd` callback will be called when [+] is pressed
export function TabKeybindings<T>({
  dependencies,
  tabs,
  onAdd,
  setCurrentTab,
}: TabKeybindingsProps<T>) {
  const keybindings = (e: KeyboardEvent) => {
    if (e.ctrlKey) {
      tabs.forEach((tab, n) => {
        if (e.key === `${n + 1}`) {
          e.preventDefault();
          setCurrentTab(tab);
        }
      });
    }
    if (onAdd) {
      if (e.key === '+') {
        e.preventDefault();
        onAdd();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', keybindings);
    return () => window.removeEventListener('keydown', keybindings);
  }, dependencies);

  return <></>;
}
