import React, { FC } from 'react';
import {
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  AppBarContentPortal,
  SearchBar,
  FilterController,
} from '@openmsupply-client/common';
import {
  RequestRequisitionRowFragment,
  useDeleteSelectedRequisitions,
} from '../api';

export const Toolbar: FC<{
  filter: FilterController;
}> = ({ filter }) => {
  const onDelete = useDeleteSelectedRequisitions();
  const t = useTranslation('replenishment');

  const key = 'comment' as keyof RequestRequisitionRowFragment;
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
        onChange={newValue => {
          if (!newValue) {
            return filter.onClearFilterRule('comment');
          }
          return filter.onChangeStringFilterRule('comment', 'like', newValue);
        }}
      />

      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
