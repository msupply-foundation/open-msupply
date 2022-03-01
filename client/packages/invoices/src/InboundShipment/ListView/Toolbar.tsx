import React, { FC } from 'react';
import {
  useTranslation,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  AppBarContentPortal,
  FilterController,
  SearchBar,
} from '@openmsupply-client/common';
import { useDeleteSelectedInbounds, InboundRowFragment } from '../api';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const t = useTranslation();
  const onDelete = useDeleteSelectedInbounds();

  const key = 'comment' as keyof InboundRowFragment;
  const filterString = filter.filterBy?.[key]?.like as string;

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
        placeholder="Search by comment..."
        value={filterString}
        onChange={newValue =>
          filter.onChangeStringFilterRule('comment', 'like', newValue)
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
