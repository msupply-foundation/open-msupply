import React, { FC, useEffect, useRef } from 'react';
import {
  useNotification,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  useTableStore,
  AppBarContentPortal,
  SearchBar,
  FilterController,
} from '@openmsupply-client/common';
import { canDeleteStocktake } from '../../utils';
import { StocktakeRowFragment, useDeleteSelectedStocktakes } from '../api';

export const Toolbar: FC<{
  filter: FilterController;
  data?: StocktakeRowFragment[];
}> = ({ data, filter }) => {
  const { mutate } = useDeleteSelectedStocktakes();
  const t = useTranslation('inventory');

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as StocktakeRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const canDeleteRows = selectedRows.every(canDeleteStocktake);
      if (!canDeleteRows) {
        const cannotDeleteSnack = info(t('messages.cant-delete-stocktakes'));
        cannotDeleteSnack();
      } else {
        mutate(selectedRows);
        const deletedMessage = t('messages.deleted-stocktakes', {
          number: numberSelected,
        });
        const successSnack = success(deletedMessage);
        successSnack();
      }
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  const ref = useRef(deleteAction);

  useEffect(() => {
    ref.current = deleteAction;
  }, [selectedRows]);

  const key = 'comment';
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
          filter.onChangeStringFilterRule('comment', 'like', newValue);
        }}
      />

      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
