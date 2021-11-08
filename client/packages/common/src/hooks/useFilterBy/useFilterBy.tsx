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

// type FilterRule = Record<
//   FilterByConditionByType['string'] | FilterByConditionByType['date'],
//   unknown
// >;

export type FilterBy<T> = Partial<Record<Partial<keyof T>, FilterRule>>;

export interface FilterController<T> {
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

export interface FilterState<T> extends FilterController<T> {
  filter: FilterController<T>;
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

  const filterState = {
    filterBy,
    onChangeStringFilterRule,
    onChangeDateFilterRule,
    onClearFilterRule,
  };

  return { ...filterState, filter: filterState };
};
