import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  useNotification,
  BufferedTextInput,
  useBufferState,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import { useStocktakeFields, useIsStocktakeDisabled } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation(['distribution', 'common', 'inventory']);
  const { success, info } = useNotification();
  const isDisabled = useIsStocktakeDisabled();
  const { description, update } = useStocktakeFields('description');
  const [descriptionBuffer, setDescriptionBuffer] = useBufferState(description);

  // const { selectedRows } = useTableStore(state => ({
  //   selectedRows: Object.keys(state.rowState)
  //     .filter(id => state.rowState[id]?.isSelected)
  //     .map(selectedId => draft.lines.find(({ id }) => selectedId === id))
  //     .filter(Boolean) as StocktakeItem[],
  // }));
  const selectedRows: unknown[] = [];

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
              <BufferedTextInput
                disabled={isDisabled}
                size="small"
                sx={{ width: 220 }}
                value={descriptionBuffer ?? ''}
                onChange={event => {
                  setDescriptionBuffer(event.target.value);
                  update({ description: event.target.value });
                }}
              />
            }
          />
        </Grid>
        <Grid item>
          <DropdownMenu disabled={isDisabled} label={t('label.select')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
              {t('button.delete-lines', { ns: 'distribution' })}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
