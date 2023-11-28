import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  SearchBar,
  FilterController,
} from '@openmsupply-client/common';

interface ToolbarProps {
  filter: FilterController;
}

export const Toolbar: FC<ToolbarProps> = ({ filter }) => {
  const t = useTranslation('common');
  const filterString = (filter.filterBy?.['name']?.like as string) || '';

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
        value={filterString ?? ''}
        onChange={newValue => {
          if (!newValue) {
            return filter.onClearFilterRule('name');
          }
          return filter.onChangeStringFilterRule('name', 'like', newValue);
        }}
      />
    </AppBarContentPortal>
  );
};
