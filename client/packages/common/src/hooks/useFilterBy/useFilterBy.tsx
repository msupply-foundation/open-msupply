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

type FilterBy<PossibleFilterKey extends string> = Record<
  PossibleFilterKey,
  FilterRule
>;

interface UseFilterByControl<PossibleFilterKey extends string> {
  filterBy: FilterBy<PossibleFilterKey>;

  onChangeDateFilterRule: (
    key: PossibleFilterKey,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => void;

  onChangeStringFilterRule: (
    key: PossibleFilterKey,
    condition: FilterByConditionByType['string'],
    value: string
  ) => void;

  onClearFilterRule: (key: PossibleFilterKey) => void;
}

export const useFilterBy = <PossibleFilterKey extends string>(
  initialFilterBy: FilterBy<PossibleFilterKey>
): UseFilterByControl<PossibleFilterKey> => {
  const [filterBy, setFilterBy] =
    useState<FilterBy<PossibleFilterKey>>(initialFilterBy);

  const onChangeStringFilterRule = (
    key: PossibleFilterKey,
    condition: FilterByConditionByType['string'],
    value: string
  ) => {
    const newFilterRule = { [key]: { [condition]: value } };

    setFilterBy({ ...filterBy, ...newFilterRule });
  };

  const onChangeDateFilterRule = (
    key: PossibleFilterKey,
    condition: FilterByConditionByType['date'],
    value: Date
  ) => {
    const newFilterRule = { [key]: { [condition]: value } };
    setFilterBy({ ...filterBy, ...newFilterRule });
  };

  const onClearFilterRule = (key: PossibleFilterKey) => {
    setFilterBy({ ...filterBy, [key]: null });
  };

  return {
    filterBy,
    onChangeStringFilterRule,
    onChangeDateFilterRule,
    onClearFilterRule,
  };
};
