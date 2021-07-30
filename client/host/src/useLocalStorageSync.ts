/* eslint-disable no-unused-vars */
import React from 'react';

type LocalStorageSetter<T> = {
  value: T | null;
  setItem: (storageObject: T) => void;
};

export const useLocalStorageSync = <T>(key: string): LocalStorageSetter<T> => {
  const loadFromLocalStorage = (): T | null => {
    const storedValue = localStorage.getItem(key);
    if (!storedValue) {
      return null;
    } else {
      return JSON.parse(storedValue);
    }
  };
  const [value, setValue] = React.useState(loadFromLocalStorage);

  const setItem = (value: T) => {
    localStorage.setItem(key, JSON.stringify(value));
    setValue(value);
  };

  return {
    value,
    setItem,
  };
};
