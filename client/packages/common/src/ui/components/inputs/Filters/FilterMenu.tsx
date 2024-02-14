import React, { FC, useState } from 'react';
import { CloseIcon, SearchIcon } from '@common/icons';
import { useUrlQuery } from '@common/hooks';
import { InlineSpinner } from '../../loading';
import { Box } from '@mui/material';
import {
  IconButton,
  InputAdornment,
  DropdownMenu,
  DropdownMenuItem,
  Divider,
} from '@common/components';
import { useTranslation } from '@common/intl';
import { TextFilter, TextFilterDefinition } from './TextFilter';
import { EnumFilter, EnumFilterDefinition } from './EnumFilter';
import { DateFilterDefinition, DateFilter } from './DateFilter';
import { NumberFilter, NumberFilterDefinition } from './NumberFilter';
import { BooleanFilter, BooleanFilterDefinition } from './BooleanFilter';

export interface FilterDefinitionCommon {
  name: string;
  urlParameter: string;
  isDefault?: boolean;
}

interface GroupFilterDefinition {
  type: 'group';
  name: string;
  elements: FilterDefinition[];
}

export type FilterDefinition =
  | TextFilterDefinition
  | EnumFilterDefinition
  | DateFilterDefinition
  | NumberFilterDefinition
  | BooleanFilterDefinition;

interface FilterDefinitions {
  filters: (FilterDefinition | GroupFilterDefinition)[];
}

// CONSTANTS
const RESET_KEYWORD = 'RESET';
export const FILTER_WIDTH = 220;

export const FilterMenu: FC<FilterDefinitions> = ({ filters }) => {
  const t = useTranslation();
  const { urlQuery, updateQuery } = useUrlQuery();
  const [activeFilters, setActiveFilters] = useState<FilterDefinition[]>(
    flattenFilterDefinitions(filters).filter(
      fil => Object.keys(urlQuery).includes(fil.urlParameter) || fil.isDefault
    )
  );

  const filterOptions = getFilterOptions(filters, activeFilters);

  const handleSelect = (
    selected: FilterDefinition | GroupFilterDefinition | typeof RESET_KEYWORD
  ) => {
    if (selected === RESET_KEYWORD) {
      const queryPatch = Object.fromEntries(
        activeFilters.map(({ urlParameter }) => [urlParameter, ''])
      );
      updateQuery(queryPatch);
      setActiveFilters(activeFilters.filter(fil => fil.isDefault));
      return;
    }
    if (selected.type === 'group') {
      const newFilters = selected.elements.filter(
        f =>
          activeFilters.findIndex(
            fil => fil.urlParameter === f.urlParameter
          ) === -1
      );
      setActiveFilters(current => [...current, ...newFilters]);
      return;
    }

    setActiveFilters(current => [...current, selected]);
  };

  const removeFilter = (filterDefinition: FilterDefinition) => {
    const newActiveFilters = activeFilters.filter(
      fil => fil.urlParameter !== filterDefinition.urlParameter
    );
    updateQuery({ [filterDefinition.urlParameter]: '' });
    setActiveFilters(newActiveFilters);
  };

  const showRemoveOption = activeFilters.length > 0;

  return (
    <Box
      display="flex"
      gap={2}
      sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}
    >
      {/* 13px margin to make menu match the individual filter inputs */}
      <DropdownMenu label={t('label.filters')} sx={{ marginTop: '13px' }}>
        {filterOptions.map(option => (
          <FilterMenuItem
            key={
              option.value.type === 'group'
                ? option.value.name
                : option.value.urlParameter
            }
            onClick={() => handleSelect(option.value)}
            label={option.label}
          />
        ))}
        {showRemoveOption && <Divider />}
        {showRemoveOption && (
          <FilterMenuItem
            onClick={() => handleSelect(RESET_KEYWORD)}
            label={t('label.remove-all-filters')}
          />
        )}
      </DropdownMenu>
      {activeFilters.map(filter => getFilterComponent(filter, removeFilter))}
    </Box>
  );
};

const FilterMenuItem: FC<{ onClick: () => void; label: string }> = ({
  onClick,
  label,
}) => (
  <DropdownMenuItem onClick={onClick} sx={{ fontSize: 14 }}>
    {label}
  </DropdownMenuItem>
);

const getFilterOptions = (
  filters: (FilterDefinition | GroupFilterDefinition)[],
  activeFilters: FilterDefinition[]
) => {
  const activeFilterCodes = activeFilters.map(fil => fil.urlParameter);

  return filters
    .filter(fil =>
      fil.type === 'group'
        ? !fil.elements.every(innerFil =>
            activeFilterCodes.includes(innerFil.urlParameter)
          )
        : !activeFilterCodes.includes(fil.urlParameter)
    )
    .map(fil => ({
      label: fil.name,
      value: fil,
    }));
};

const flattenFilterDefinitions = (
  filters: (FilterDefinition | GroupFilterDefinition)[]
) => {
  const flattened: FilterDefinition[] = [];
  filters.forEach(fil => {
    if ('urlParameter' in fil) flattened.push(fil);
    else flattened.push(...fil.elements);
  });
  return flattened;
};

const getFilterComponent = (
  filter: FilterDefinition,
  removeFilter: (filter: FilterDefinition) => void
) => {
  switch (filter.type) {
    case 'text':
      return (
        <TextFilter
          key={filter.urlParameter}
          filterDefinition={filter}
          remove={() => removeFilter(filter)}
        />
      );
    case 'enum':
      return (
        <EnumFilter
          key={filter.urlParameter}
          filterDefinition={filter}
          remove={() => removeFilter(filter)}
        />
      );
    case 'date':
    case 'dateTime':
      return (
        <DateFilter
          key={`${filter.urlParameter}${
            filter.range ? '_' + filter.range : ''
          }`}
          filterDefinition={filter}
        />
      );
    case 'number':
      return (
        <NumberFilter
          key={`${filter.urlParameter}${
            filter.range ? '_' + filter.range : ''
          }`}
          filterDefinition={filter}
        />
      );
    case 'boolean':
      return (
        <BooleanFilter key={filter.urlParameter} filterDefinition={filter} />
      );
    default:
      return null;
  }
};

export const EndAdornment: FC<{
  isLoading: boolean;
  hasValue: boolean;
  onClear: () => void;
}> = ({ hasValue, isLoading, onClear }) => {
  const t = useTranslation();
  if (isLoading) return <InlineSpinner />;

  return (
    <InputAdornment position="end">
      <IconButton
        sx={{ color: 'gray.main' }}
        label={hasValue ? t('label.clear-filter') : ''}
        onClick={hasValue ? onClear : () => {}}
        icon={hasValue ? <CloseIcon /> : <SearchIcon fontSize="small" />}
      />
    </InputAdornment>
  );
};
