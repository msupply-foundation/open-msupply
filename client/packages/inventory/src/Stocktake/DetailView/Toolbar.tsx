import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  useNotification,
  useTableStore,
} from '@openmsupply-client/common';
import { StocktakeController, StocktakeItem } from '../../types';
import { isStocktakeEditable } from '../../utils';

interface ToolbarProps {
  draft: StocktakeController;
}

export const Toolbar: FC<ToolbarProps> = ({ draft }) => {
  const t = useTranslation(['distribution', 'common']);
  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => draft.lines.find(({ id }) => selectedId === id))
      .filter(Boolean) as StocktakeItem[],
  }));

  const deleteAction = () => {
    if (selectedRows && selectedRows?.length > 0) {
      const successSnack = success(`Deleted ${selectedRows?.length} lines`);
      successSnack();
    } else {
      const infoSnack = info(t('label.select-rows-to-delete-them'));
      infoSnack();
    }
  };

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid item display="flex" justifyContent="flex-end" flex={1}>
          <DropdownMenu
            disabled={!isStocktakeEditable(draft)}
            label={t('label.select')}
          >
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
              {t('button.delete-lines', { ns: 'distribution' })}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
