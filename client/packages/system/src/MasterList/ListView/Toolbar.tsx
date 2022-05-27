import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  SearchBar,
  FilterController,
} from '@openmsupply-client/common';
import { MasterListRow } from '../types';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation('common');

  const key = 'name' as keyof MasterListRow;
  const filterString = (filter.filterBy?.[key]?.like as string) || '';
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
