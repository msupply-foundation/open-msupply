import React from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  SearchBar,
  FilterRule,
  useUrlQueryParams,
} from '@openmsupply-client/common';

export const Toolbar = () => {
  const t = useTranslation();

  const { filter } = useUrlQueryParams({
    filters: [{ key: 'codeOrName' }],
  });

  const filterString =
    ((filter.filterBy?.['codeOrName'] as FilterRule)?.like as string) || '';

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
        placeholder={t('placeholder.enter-code-or-name')}
        value={filterString ?? ''}
        onChange={newValue => {
          return filter.onChangeStringFilterRule(
            'codeOrName',
            'like',
            newValue
          );
        }}
      />
    </AppBarContentPortal>
  );
};
