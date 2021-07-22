import React from 'react';

export const useLocalStorageSync = key => {
  const loadFromLocalStorage = () => JSON.parse(localStorage.getItem(key));
  const [value, setValue] = React.useState(loadFromLocalStorage);
  const setItem = value => {
    localStorage.setItem(key, JSON.stringify(value));
    setValue(value);
  };

  return {
    value,
    setItem,
  };
};
