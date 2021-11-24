import React, { FC } from 'react';
import {
  AppBarContentPortal,
  useTranslation,
  SearchBar,
} from '@openmsupply-client/common';

interface ToolbarProps {
  filterString: string | null;
  onChangeFilter: (filterString: string) => void;
  isLoading: boolean;
}

export const Toolbar: FC<ToolbarProps> = ({
  filterString,
  onChangeFilter,
  isLoading,
}) => {
  const t = useTranslation(['common']);

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
        isLoading={isLoading}
        placeholder={t('placeholder.enter-an-item-code-or-name')}
        value={filterString ?? ''}
        onChange={newValue => onChangeFilter(newValue)}
      />
    </AppBarContentPortal>
  );
};
