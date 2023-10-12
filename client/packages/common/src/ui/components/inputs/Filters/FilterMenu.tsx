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

export interface FilterDefinitionCommon {
  name: string;
  urlParameter: string;
}

type FilterDefinition = TextFilterDefinition | EnumFilterDefinition;

interface FilterDefinitions {
  filters: FilterDefinition[];
}

// CONSTANTS
const RESET_KEYWORD = 'RESET';
export const FILTER_WIDTH = '220px';

export const FilterMenu: FC<FilterDefinitions> = ({ filters }) => {
  const t = useTranslation();
  const { urlQuery, updateQuery } = useUrlQuery();
  const [activeFilters, setActiveFilters] = useState<FilterDefinition[]>(
    filters.filter(fil => Object.keys(urlQuery).includes(fil.urlParameter))
  );

  const filterOptions = getFilterOptions(filters, activeFilters);

  const handleSelect = (selected: string) => {
    if (selected === RESET_KEYWORD) {
      const queryPatch = Object.fromEntries(
        activeFilters.map(({ urlParameter }) => [urlParameter, ''])
      );
      updateQuery(queryPatch);
      setActiveFilters([]);
      return;
    }
    const selectedFilter = filters.find(fil => fil.urlParameter === selected);
    if (selectedFilter)
      setActiveFilters(current => [...current, selectedFilter]);
  };

  const removeFilter = (filterDefinition: FilterDefinition) => {
    const newActiveFilters = activeFilters.filter(
      fil => fil.urlParameter !== filterDefinition.urlParameter
    );
    updateQuery({ [filterDefinition.urlParameter]: '' });
    setActiveFilters(newActiveFilters);
  };

  return (
    <Box
      display="flex"
      gap={2}
      sx={{ alignItems: 'flex-end', minHeight: 50, flexWrap: 'wrap' }}
    >
      <DropdownMenu label={t('label.filters')}>
        {filterOptions.map(option => (
          <FilterMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            label={option.label}
          />
        ))}
        {activeFilters.length > 0 && (
          <>
            <Divider />
            <FilterMenuItem
              key="remove-filters"
              onClick={() => handleSelect(RESET_KEYWORD)}
              label={t('label.remove-all-filters')}
            />
          </>
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
  filters: FilterDefinition[],
  activeFilters: FilterDefinition[]
) => {
  const activeFilterCodes = activeFilters.map(fil => fil.urlParameter);

  return filters
    .filter(fil => !activeFilterCodes.includes(fil.urlParameter))
    .map(fil => ({ label: fil.name, value: fil.urlParameter }));
};

const getFilterComponent = (
  filter: FilterDefinition,
  removeFilter: (filter: FilterDefinition) => void
) => {
  switch (filter.type) {
    case 'text':
      return (
        <TextFilter
          filterDefinition={filter}
          remove={() => removeFilter(filter)}
        />
      );
    case 'enum':
      return (
        <EnumFilter
          filterDefinition={filter}
          remove={() => removeFilter(filter)}
        />
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
