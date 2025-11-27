import React, { useState } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  Tooltip,
  DateTimePickerInput,
  Formatter,
  useNotification,
  NumericTextInput,
  useConfirmationModal,
} from '@openmsupply-client/common';
import {
  CurrencyAutocomplete,
  CurrencyRowFragment,
  SupplierSearchInput,
} from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { NameFragment } from '@openmsupply-client/system';
import { PurchaseOrderFragment, usePurchaseOrderLine } from '../api';
import { isFieldDisabled, StatusGroup } from '../../utils';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const {
    draft,
    query: { data, isFetching },
    update: { update },
    handleChange,
  } = usePurchaseOrder();
  const { updateLines } = usePurchaseOrderLine();

  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    new Date(data?.requestedDeliveryDate ?? '')
  );

  const getMostRecentExpectedDate = () => {
    const dates = data?.lines?.nodes
      ?.map(line => line.expectedDeliveryDate)
      .sort((a, b) => (b || '').localeCompare(a || ''));
    return dates?.[0] ? dates[0] : null;
  };

  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(getMostRecentExpectedDate() ?? '')
  );

  const disabledRequestedDeliveryDate = data?.status
    ? isFieldDisabled(data.status, StatusGroup.AfterConfirmed)
    : false;
  const disabledExpectedDeliveryDate = data?.status
    ? isFieldDisabled(data.status, StatusGroup.AfterSent)
    : false;

  const handleUpdate = (input: Partial<PurchaseOrderFragment>) => {
    try {
      update(input);
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const handleCurrencyChange = async (currency: CurrencyRowFragment | null) => {
    if (!currency) return;

    handleChange({
      currencyId: currency.id,
      foreignExchangeRate: currency.rate,
    });
  };

  const updateExpectedDeliveryChange = async (date: Date | null) => {
    if (!data) return;
    const formattedDate = Formatter.naiveDate(date);
    await updateLines(data?.lines?.nodes, {
      expectedDeliveryDate: formattedDate,
    });
  };

  const confirmModal = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t(
      'label.update-purchase-order-expected-delivery-date-for-all-lines'
    ),
    onConfirm: () => {},
  });

  const handleExpectedDeliveryDateChange = (newDate: Date | null) => {
    if (!newDate) return;
    const previousDate = expectedDeliveryDate;

    setExpectedDeliveryDate(newDate);
    confirmModal({
      onConfirm: () => updateExpectedDeliveryChange(newDate),
      onCancel: () => setExpectedDeliveryDate(previousDate),
    });
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
                  disabled={isDisabled || isFetching}
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
                decimalLimit={4}
                disabled={true}
                width={150}
              />
            }
          />
        </Grid>
        <Grid display="flex" flexGrow={1} gap={1}>
          <Grid display="flex" flexDirection="column" gap={1}>
            <InputWithLabelRow
              label={t('label.requested-delivery-date')}
              Input={
                <DateTimePickerInput
                  value={requestedDeliveryDate}
                  onChange={date => {
                    if (!date) return;
                    setRequestedDeliveryDate(date);
                    const formattedDate = Formatter.naiveDate(date);
                    handleUpdate({
                      requestedDeliveryDate: formattedDate,
                    });
                  }}
                  width={250}
                  disabled={disabledRequestedDeliveryDate}
                />
              }
            />
            <InputWithLabelRow
              label={t('label.expected-delivery-date')}
              Input={
                <DateTimePickerInput
                  value={expectedDeliveryDate}
                  onChange={handleExpectedDeliveryDateChange}
                  width={250}
                  disabled={disabledExpectedDeliveryDate}
                />
              }
            />
          </Grid>
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
