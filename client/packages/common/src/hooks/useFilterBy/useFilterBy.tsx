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

export type FilterBy = Record<string, FilterRule | null>;

export interface FilterController {
  filterBy: FilterBy | null;

  onChangeDateFilterRule: (
    key: string,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => void;

  onChangeStringFilterRule: (
    key: string,
    condition: FilterByConditionByType['string'],
    value: string
  ) => void;

  onClearFilterRule: (key: string) => void;
}

export interface FilterState extends FilterController {
  filter: FilterController;
}

export const useFilterBy = (initialFilterBy?: FilterBy | null): FilterState => {
  const [filterBy, setFilterBy] = useState<FilterBy | null>(
    initialFilterBy ?? null
  );

  const onChangeStringFilterRule = (
    key: string,
    condition: FilterByConditionByType['string'],
    value: string
  ) => {
    const newFilter = { [key]: { [condition]: value } };
    setFilterBy({ ...filterBy, ...newFilter });
  };

  const onChangeDateFilterRule = (
    key: string,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => {
    const newFilter = { [key]: { [condition]: value } };
    setFilterBy({ ...filterBy, ...newFilter });
  };

  const onClearFilterRule = (key: string) => {
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
