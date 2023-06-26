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

  const firstNameFilterString =
    (filter.filterBy?.['firstName' as keyof PatientRowFragment]
      ?.like as string) || '';
  const lastNameFilterString =
    (filter.filterBy?.['lastName' as keyof PatientRowFragment]
      ?.like as string) || '';
  const identifierFilterString =
    (filter.filterBy?.['identifier' as keyof PatientRowFragment]
      ?.like as string) || '';

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
          value={firstNameFilterString}
          onChange={newValue => {
            filter.onChangeStringFilterRule('firstName', 'like', newValue);
          }}
        />
        <SearchBar
          placeholder={t('placeholder.search-by-last-name')}
          value={lastNameFilterString}
          onChange={newValue => {
            filter.onChangeStringFilterRule('lastName', 'like', newValue);
          }}
        />
        <SearchBar
          placeholder={t('placeholder.search-by-identifier')}
          value={identifierFilterString}
          onChange={newValue => {
            filter.onChangeStringFilterRule('identifier', 'like', newValue);
          }}
        />
      </Box>
    </AppBarContentPortal>
  );
};
