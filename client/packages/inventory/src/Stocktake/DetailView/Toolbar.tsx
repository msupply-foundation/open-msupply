import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  useNotification,
  useTableStore,
  BasicTextInput,
  InputWithLabelRow,
  DatePickerInput,
} from '@openmsupply-client/common';
import { StocktakeController, StocktakeItem } from '../../types';
import { isStocktakeEditable } from '../../utils';

interface ToolbarProps {
  draft: StocktakeController;
}

export const Toolbar: FC<ToolbarProps> = ({ draft }) => {
  const t = useTranslation(['distribution', 'common', 'inventory']);
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
        <Grid item display="flex" flex={1} flexDirection="column" gap={1}>
          <InputWithLabelRow
            label={t('heading.description')}
            Input={
              <BasicTextInput
                disabled={!isStocktakeEditable(draft)}
                size="small"
                sx={{ width: 220 }}
                value={draft.description ?? ''}
                onChange={event => {
                  draft.update('description', event.target.value);
                }}
              />
            }
          />

          <InputWithLabelRow
            label={t('label.stocktake-date', { ns: 'inventory' })}
            Input={
              <DatePickerInput
                disabled={!isStocktakeEditable(draft)}
                value={draft.stocktakeDatetime}
                onChange={newDate => {
                  draft.updateStocktakeDatetime(newDate);
                }}
              />
            }
          />
        </Grid>
        <Grid item>
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
