import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  SearchBar,
  FilterController,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';

interface ToolbarProps {
  filter: FilterController;
}

export const Toolbar: FC<ToolbarProps> = ({ filter }) => {
  const t = useTranslation('inventory');
  const key = 'itemCodeOrName' as keyof StockLineRowFragment;
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
        placeholder={t('placeholder.enter-an-item-code-or-name')}
        value={filterString ?? ''}
        onChange={newValue => {
          if (!newValue) {
            return filter.onClearFilterRule('itemCodeOrName');
          }
          return filter.onChangeStringFilterRule(
            'itemCodeOrName',
            'like',
            newValue
          );
        }}
      />
    </AppBarContentPortal>
  );
};
