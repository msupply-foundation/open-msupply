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
  const t = useTranslation('inventory');
  const filterString = (filter.filterBy?.['codeOrName']?.like as string) || '';

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
        placeholder={t('placeholder.enter-an-item-code-or-name')}
        value={filterString ?? ''}
        onChange={newValue => {
          if (!newValue) {
            return filter.onClearFilterRule('codeOrName');
          }
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
