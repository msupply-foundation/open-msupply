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
  Box,
  Switch,
  DateUtils,
  Alert,
  useIsGrouped,
  useUrlQuery,
  RewindIcon,
  useEditModal,
} from '@openmsupply-client/common';
import { useStocktake } from '../api';
import { SetLinesToZeroConfirmationModal } from './SetLinesToZeroModal';

export const Toolbar = () => {
  const { isGrouped, toggleIsGrouped } = useIsGrouped('stocktake');
  const [localIsGrouped, setLocalIsGrouped] = React.useState(isGrouped);
  const isDisabled = useStocktake.utils.isDisabled();
  const t = useTranslation('inventory');
  const { isLocked, stocktakeDate, description, update } =
    useStocktake.document.fields(['isLocked', 'description', 'stocktakeDate']);
  const onDelete = useStocktake.line.deleteSelected();
  const [descriptionBuffer, setDescriptionBuffer] = useBufferState(description);

  const { isOpen, onClose, onOpen } = useEditModal();

  const infoMessage = isLocked
    ? t('messages.on-hold-stock-take')
    : t('messages.finalised-stock-take');
  const onChangeIsGrouped = () => {
    setLocalIsGrouped(!localIsGrouped);
    // when the render of the dependent component is slow
    // separate the render of the switch change from the wider state change
    // otherwise the switch doesn't render until the slow component completes
    setTimeout(toggleIsGrouped, 100);
  };
  const { urlQuery, updateQuery } = useUrlQuery({
    skipParse: ['itemCodeOrName'],
  });
  const itemFilter = (urlQuery['itemCodeOrName'] as string) ?? '';
  const setItemFilter = (itemFilter: string) =>
    updateQuery({ itemCodeOrName: itemFilter });

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        {/* 
     
        probably super similar to the delete confirmation modal,
        can we make a confirmation with additional input modal?

        will also need for change location
        */}
        {isOpen && (
          <SetLinesToZeroConfirmationModal isOpen={isOpen} onCancel={onClose} />
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
          <Box sx={{ marginRight: 2 }}>
            <Switch
              label={t('label.group-by-item')}
              onChange={onChangeIsGrouped}
              checked={localIsGrouped}
              size="small"
              color="secondary"
            />
          </Box>
          <DropdownMenu disabled={isDisabled} label={t('label.actions')}>
            <DropdownMenuItem IconComponent={RewindIcon} onClick={onOpen}>
              {t('button.reduce-lines-to-zero')}
            </DropdownMenuItem>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines')}
            </DropdownMenuItem>
          </DropdownMenu>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
