import React from 'react';
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
  DateTimePickerInput,
  Formatter,
  SearchBar,
  DateUtils,
  Alert,
  useUrlQuery,
  RewindIcon,
  useEditModal,
  useNotification,
  ArrowRightIcon,
} from '@openmsupply-client/common';
import { useStocktake } from '../api';
import { ReduceLinesToZeroConfirmationModal } from './ReduceLinesToZeroModal';
import { ChangeLocationConfirmationModal } from './ChangeLocationModal';

export const Toolbar = () => {
  const { info } = useNotification();
  const isDisabled = useStocktake.utils.isDisabled();
  const t = useTranslation();
  const { isLocked, stocktakeDate, description, update } =
    useStocktake.document.fields(['isLocked', 'description', 'stocktakeDate']);
  const onDelete = useStocktake.line.deleteSelected();
  const [descriptionBuffer, setDescriptionBuffer] = useBufferState(description);

  const infoMessage = isLocked
    ? t('messages.on-hold-stock-take')
    : t('messages.finalised-stock-take');

  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['itemCodeOrName'],
  });
  const itemFilter = (urlQuery['itemCodeOrName'] as string) ?? '';
  const setItemFilter = (itemFilter: string) =>
    updateQuery({ itemCodeOrName: itemFilter });

  const reduceModal = useEditModal();
  const changeLocationModal = useEditModal();

  const selectedRows = useStocktake.utils.selectedRows();

  const checkSelected = () => {
    if (!selectedRows.length) {
      const selectRowsSnack = info(t('messages.no-lines-selected'));
      selectRowsSnack();
      return;
    }
    if (isDisabled) {
      const isLockedSnack = info(t('error.is-locked'));
      isLockedSnack();
      return;
    }
    return true;
  };

  const openReduceToZeroModal = () => {
    if (checkSelected()) reduceModal.onOpen();
  };

  const openChangeLocationModal = () => {
    if (checkSelected()) changeLocationModal.onOpen();
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
        {reduceModal.isOpen && (
          <ReduceLinesToZeroConfirmationModal
            isOpen={reduceModal.isOpen}
            onCancel={reduceModal.onClose}
          />
        )}
        {changeLocationModal.isOpen && (
          <ChangeLocationConfirmationModal
            isOpen={changeLocationModal.isOpen}
            onCancel={changeLocationModal.onClose}
          />
        )}
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
              <DateTimePickerInput
                disabled={true}
                value={DateUtils.getDateOrNull(stocktakeDate)}
                onChange={date => {
                  if (DateUtils.isValid(date))
                    update({ stocktakeDate: Formatter.naiveDate(date) });
                }}
              />
            }
          />
          {isDisabled && <Alert severity="info">{infoMessage}</Alert>}
        </Grid>
        <Grid
          item
          display="flex"
          gap={1}
          justifyContent="flex-end"
          alignItems="center"
        >
          <SearchBar
            placeholder={t('placeholder.filter-items')}
            value={itemFilter}
            onChange={newValue => {
              setItemFilter(newValue);
            }}
          />
          <DropdownMenu disabled={isDisabled} label={t('label.actions')}>
            <>
              <DropdownMenuItem
                IconComponent={ArrowRightIcon}
                onClick={openChangeLocationModal}
              >
                {t('button.change-location')}
              </DropdownMenuItem>
              <DropdownMenuItem
                IconComponent={RewindIcon}
                onClick={openReduceToZeroModal}
              >
                {t('button.reduce-lines-to-zero')}
              </DropdownMenuItem>
            </>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
