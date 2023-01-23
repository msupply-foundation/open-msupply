import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  SearchBar,
  FilterController,
  Box,
} from '@openmsupply-client/common';
import { PatientRowFragment } from '../api';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation('patients');

  const key = 'lastName' as keyof PatientRowFragment;
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
      <Box display="flex" gap={1}>
        <SearchBar
          placeholder={t('placeholder.search-by-first-name')}
          value={filterString}
          onChange={newValue => {
            filter.onChangeStringFilterRule('firstName', 'like', newValue);
          }}
        />
        <SearchBar
          placeholder={t('placeholder.search-by-last-name')}
          value={filterString}
          onChange={newValue => {
            filter.onChangeStringFilterRule('lastName', 'like', newValue);
          }}
        />
        <SearchBar
          placeholder={t('placeholder.search-by-identifier')}
          value={filterString}
          onChange={newValue => {
            filter.onChangeStringFilterRule('identifier', 'like', newValue);
          }}
        />
      </Box>
    </AppBarContentPortal>
  );
};
