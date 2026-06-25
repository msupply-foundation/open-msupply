import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  SearchBar,
  FilterController,
  FilterRule,
} from '@openmsupply-client/common';

interface ToolbarProps {
  filter: FilterController;
}

export const Toolbar = ({ filter }: ToolbarProps) => {
  const t = useTranslation();

  const filterString =
    ((filter.filterBy?.['name'] as FilterRule)?.like as string) || '';

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <SearchBar
        placeholder={t('placeholder.search-by-name')}
        value={filterString}
        onChange={newValue => {
          filter.onChangeStringFilterRule('name', 'like', newValue);
        }}
      />
    </AppBarContentPortal>
  );
};
