import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  SearchBar,
} from '@openmsupply-client/common';

interface ToolbarProps {
  filterString: string | null;
  onChangeFilter: (filter: { filter: string }) => void;
}

export const Toolbar: FC<ToolbarProps> = ({ filterString, onChangeFilter }) => {
  const t = useTranslation('inventory');

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
        onChange={newValue => onChangeFilter({ filter: newValue })}
      />
    </AppBarContentPortal>
  );
};
