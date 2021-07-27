/* eslint-disable no-unused-vars */
import React from 'react';

declare global {
  const localStorage: {
    getItem: (key: string) => string;
    setItem: (key: string, object: any) => void;
  };
}

export const useLocalStorageSync = (key: string) => {
  const loadFromLocalStorage = () => JSON.parse(localStorage.getItem(key));
  const [value, setValue] = React.useState(loadFromLocalStorage);
  const setItem = (value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    setValue(value);
  };

  return {
    value,
    setItem,
  };
};
