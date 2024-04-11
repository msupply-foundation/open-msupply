import { useState } from 'react';

export const useStringFilter = (key: string) => {
  const filterBy = (value: string) => ({ [key]: { like: value } });
  const [filter, setFilter] = useState(filterBy(''));

  return {
    filter,
    onFilter: (text: string) => setFilter(filterBy(text)),
  };
};
