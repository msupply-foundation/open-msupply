import React, { FC } from 'react';
import {
  useTranslation,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  AppBarContentPortal,
  FilterController,
  SearchBar,
  useUrlQuery,
} from '@openmsupply-client/common';
import { useInbound, InboundRowFragment } from '../api';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation('replenishment');
  const onDelete = useInbound.document.delete();
  const { urlQuery } = useUrlQuery();

  const key = 'otherPartyName' as keyof InboundRowFragment;
  const filterString = urlQuery[key] || '';

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
        onChange={newValue =>
          filter.onChangeStringFilterRule('otherPartyName', 'like', newValue)
        }
      />

      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
