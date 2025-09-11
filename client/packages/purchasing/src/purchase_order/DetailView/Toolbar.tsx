import React, { useState } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Tooltip,
  DateTimePickerInput,
  DateUtils,
  Formatter,
  useNotification,
  NumericTextInput,
} from '@openmsupply-client/common';
import {
  CurrencyAutocomplete,
  CurrencyRowFragment,
  SupplierSearchInput,
} from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { NameFragment } from 'packages/system/src/Name/api/operations.generated';
import { PurchaseOrderFragment } from '../api';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const { error, warning } = useNotification();
  const {
    draft,
    query: { data, isLoading },
    lines: { itemFilter, setItemFilter },
    update: { update },
    handleChange,
  } = usePurchaseOrder();

  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    DateUtils.getDateOrNull(data?.requestedDeliveryDate)
  );

  const handleUpdate = (input: Partial<PurchaseOrderFragment>) => {
    try {
      update(input);
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const handleCurrencyChange = (currency: CurrencyRowFragment | null) => {
    if (!currency) return;
    handleChange({
      currencyId: currency.id,
      foreignExchangeRate: currency.rate,
    });
  };

  const handleForeignExchangeRateChange = (value: number | undefined) => {
    if (value == null || value === draft?.foreignExchangeRate) return;
    if (draft?.foreignExchangeRate !== value) {
      warning(t('warning.foreign-exchange-rate-different'))();
      handleChange({ foreignExchangeRate: value });
    }
  };

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginBottom: 1,
        flexDirection: 'column',
      }}
    >
      <Grid container gap={2}>
        <Grid display="flex" flexDirection="column" gap={1}>
          {data?.supplier && (
            <InputWithLabelRow
              label={t('label.supplier-name')}
              Input={
                <SupplierSearchInput
                  external
                  disabled={isDisabled || isLoading}
                  value={(data?.supplier as NameFragment) ?? null}
                  onChange={supplier => {
                    if (!supplier) return;
                    handleUpdate({ supplier: supplier });
                  }}
                />
              }
            />
          )}
          <InputWithLabelRow
            label={t('label.supplier-ref')}
            Input={
              <Tooltip title={data?.reference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={data?.reference ?? null}
                  onChange={e => {
                    handleChange({ reference: e.target.value });
                  }}
                />
              </Tooltip>
            }
          />
        </Grid>
        <Grid display="flex" flexDirection="column" gap={1}>
          <InputWithLabelRow
            label={t('label.requested-delivery-date')}
            Input={
              <DateTimePickerInput
                value={requestedDeliveryDate}
                onChange={date => {
                  setRequestedDeliveryDate(date);
                  const formattedDate = Formatter.naiveDate(date);
                  handleUpdate({
                    requestedDeliveryDate: formattedDate,
                  });
                }}
                width={250}
              />
            }
          />
        </Grid>
        <Grid display="flex" flexGrow={1} flexDirection="column" gap={1}>
          <InputWithLabelRow
            label={t('label.currency')}
            Input={
              <CurrencyAutocomplete
                currencyId={draft?.currencyId}
                onChange={handleCurrencyChange}
                width={150}
                disabled={!!draft?.confirmedDatetime}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.foreign-exchange-rate')}
            Input={
              <NumericTextInput
                value={draft?.foreignExchangeRate ?? 0}
                onChange={handleForeignExchangeRateChange}
                decimalLimit={4}
                disabled={!!draft?.confirmedDatetime}
                width={150}
              />
            }
          />
          <Grid justifyContent="flex-end" display="flex">
            <SearchBar
              placeholder={t('placeholder.filter-items')}
              value={itemFilter ?? ''}
              onChange={newValue => setItemFilter(newValue)}
              debounceTime={0}
            />
          </Grid>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
