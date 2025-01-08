import React, { FC } from 'react';
import {
  useTranslation,
  AppBarContentPortal,
  SearchBar,
  FilterController,
  FilterRule,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment } from '../api';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation();

  const key = 'otherPartyName' as keyof PrescriptionRowFragment;
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
          filter.onChangeStringFilterRule('otherPartyName', 'like', newValue);
        }}
      />
    </AppBarContentPortal>
  );
};
