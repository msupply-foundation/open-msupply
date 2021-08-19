import React, { useEffect } from 'react';
import { LocalStorageKey } from './keys';
import LocalStorage from './LocalStorage';

/**
 * Simple custom hook which will be seeded by the value within
 * localStorage paired with the key passed, or the defaultValue.
 *
 * Will update localStorage whenever the state changes.
 */

type LocalStorageSetter<T> = [
  value: T | null,
  setItem: (storageObject: T) => void
];

export const useLocalStorage = <T>(
  key: LocalStorageKey,
  defaultValue: T | null = null
): LocalStorageSetter<T> => {
  const [value, setValue] = React.useState(
    LocalStorage.getItem<T>(key, defaultValue)
  );

  useEffect(() => {
    return LocalStorage.addListener<T>((updatedKey, value) => {
      if (updatedKey === key) {
        setValue(value);
      }
    });
  }, []);

  const setItem = (value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
    setValue(value);
  };

  return [value, setItem];
};
