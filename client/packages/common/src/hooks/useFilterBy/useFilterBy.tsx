import { useState } from 'react';

interface FilterByConditionByType {
  string: 'equalTo' | 'like';
  date: 'beforeOrEqualTo' | 'afterOrEqualTo' | 'equalTo';
}

type FilterRule = {
  [P in
    | FilterByConditionByType['string']
    | FilterByConditionByType['date']]?: unknown;
};

export type FilterBy<T> = Partial<Record<Partial<keyof T>, FilterRule>>;

export interface FilterState<T> {
  filterBy: FilterBy<T> | null;

  onChangeDateFilterRule: (
    key: keyof T,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => void;

  onChangeStringFilterRule: (
    key: keyof T,
    condition: FilterByConditionByType['string'],
    value: string
  ) => void;

  onClearFilterRule: (key: keyof T) => void;
}

export const useFilterBy = <T extends unknown>(
  initialFilterBy?: FilterBy<T> | null
): FilterState<T> => {
  const [filterBy, setFilterBy] = useState<FilterBy<T> | null>(
    initialFilterBy ?? null
  );

  const onChangeStringFilterRule = (
    key: keyof T,
    condition: FilterByConditionByType['string'],
    value: string
  ) => {
    const newFilter = { [key]: { [condition]: value } };
    setFilterBy({ ...filterBy, ...newFilter });
  };

  const onChangeDateFilterRule = (
    key: keyof T,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => {
    const newFilter = { [key]: { [condition]: value } };
    setFilterBy({ ...filterBy, ...newFilter });
  };

  const onClearFilterRule = (key: keyof T) => {
    setFilterBy({ ...filterBy, [key]: null });
  };

  return {
    filterBy,
    onChangeStringFilterRule,
    onChangeDateFilterRule,
    onClearFilterRule,
  };
};
