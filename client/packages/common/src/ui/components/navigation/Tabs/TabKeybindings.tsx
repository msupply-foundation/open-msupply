import React, { useEffect } from 'react';

interface TabKeybindingsProps<T> {
  tabs: T[];
  onAdd?: () => void;
  setCurrentTab: React.Dispatch<React.SetStateAction<T>>;
}

export function TabKeybindings<T>({
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
  }, []);

  return <></>;
}
