import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  BufferedTextInput,
  useBufferState,
  InputWithLabelRow,
  DatePickerInput,
  Formatter,
} from '@openmsupply-client/common';
import { useStocktake } from '../api';

export const Toolbar: FC = () => {
  const t = useTranslation('inventory');
  const isDisabled = useStocktake.utils.isDisabled();
  const { stocktakeDate, description, update } = useStocktake.document.fields([
    'description',
    'stocktakeDate',
  ]);
  const onDelete = useStocktake.line.deleteSelected();
  const [descriptionBuffer, setDescriptionBuffer] = useBufferState(description);
  const [bufferedDate, setBufferedDate] = useBufferState(stocktakeDate);
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
          <InputWithLabelRow
            label={t('label.stocktake-date')}
            Input={
              <DatePickerInput
                disabled={isDisabled}
                value={bufferedDate ? new Date(bufferedDate) : null}
                onChange={d => {
                  const naiveDate = Formatter.naiveDate(d);
                  setBufferedDate(naiveDate);
                  update({ stocktakeDate: naiveDate });
                }}
              />
            }
          />
        </Grid>

        <Grid item>
          <DropdownMenu disabled={isDisabled} label={t('label.actions')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
