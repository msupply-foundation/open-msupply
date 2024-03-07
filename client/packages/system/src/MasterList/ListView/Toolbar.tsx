import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  SearchBar,
  FilterController,
  FilterRule,
} from '@openmsupply-client/common';
import { MasterListRow } from '../types';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation();

  const key = 'name' as keyof MasterListRow;
  const filterString =
    ((filter.filterBy?.[key] as FilterRule)?.like as string) || '';
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
