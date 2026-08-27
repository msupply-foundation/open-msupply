import React, { useEffect } from 'react';
import { LocalStorageKey, LocalStorageRecord } from './keys';
import LocalStorage from './LocalStorage';

/**
 * Simple custom hook which will be seeded by the value within
 * localStorage paired with the key passed, or the defaultValue.
 *
 * Will update localStorage whenever the state changes.
 */

type LocalStorageSetter<T> = [
  value: T | null,
  setItem: (value: T) => void,
  removeItem: () => void,
];

export const useLocalStorage = <
  StorageKey extends Extract<LocalStorageKey, string>,
>(
  key: StorageKey,
  defaultValue: LocalStorageRecord[StorageKey] | null = null
): LocalStorageSetter<LocalStorageRecord[StorageKey]> => {
  const [value, setValue] = React.useState(
    LocalStorage.getItem(key, defaultValue)
  );

  useEffect(() => {
    return LocalStorage.addListener<LocalStorageRecord[StorageKey]>(
      (updatedKey, value) => {
        if (updatedKey === key) {
          setValue(value);
        }
      }
    );
  }, []);

  const setItem = (value: LocalStorageRecord[StorageKey]) => {
    LocalStorage.setItem(key, value);
    setValue(value);
  };

  const removeItem = () => {
    LocalStorage.removeItem(key);
    setValue(undefined as LocalStorageRecord[StorageKey]);
  };

  return [value, setItem, removeItem];
};
