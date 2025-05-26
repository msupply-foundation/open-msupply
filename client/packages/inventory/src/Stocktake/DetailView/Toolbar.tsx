import React from 'react';
import {
  AppBarContentPortal,
  Grid,
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
  useSimplifiedTabletUI,
  TypedTFunction,
  LocaleKey,
  FieldUpdateMutation,
} from '@openmsupply-client/common';
import { StocktakeFragment, useStocktakeOld } from '../api';

export const Toolbar = () => {
  const isDisabled = useStocktakeOld.utils.isDisabled();
  const t = useTranslation();
  const { isLocked, stocktakeDate, description, update } =
    useStocktakeOld.document.fields([
      'isLocked',
      'description',
      'stocktakeDate',
    ]);
  const simplifiedTabletView = useSimplifiedTabletUI();
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

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        {simplifiedTabletView ? (
          <Grid display="flex" flex={1} flexDirection="row" gap={1}>
            <InformationFields
              isDisabled={isDisabled}
              descriptionBuffer={descriptionBuffer}
              setDescriptionBuffer={setDescriptionBuffer}
              update={update}
              t={t}
              stocktakeDate={stocktakeDate}
              infoMessage={infoMessage}
            />
          </Grid>
        ) : (
          <>
            <Grid display="flex" flex={1} flexDirection="column" gap={1}>
              <InformationFields
                isDisabled={isDisabled}
                descriptionBuffer={descriptionBuffer}
                setDescriptionBuffer={setDescriptionBuffer}
                update={update}
                t={t}
                stocktakeDate={stocktakeDate}
                infoMessage={infoMessage}
              />
            </Grid>
            <Grid
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
            </Grid>
          </>
        )}
      </Grid>
    </AppBarContentPortal>
  );
};

const InformationFields = ({
  isDisabled,
  descriptionBuffer,
  setDescriptionBuffer,
  update,
  t,
  stocktakeDate,
  infoMessage,
}: {
  isDisabled: boolean;
  descriptionBuffer: string | null | undefined;
  setDescriptionBuffer: (value: string) => void;
  update: FieldUpdateMutation<StocktakeFragment>;
  t: TypedTFunction<LocaleKey>;
  stocktakeDate: string | null | undefined;
  infoMessage: string;
}) => {
  return (
    <>
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
    </>
  );
};
