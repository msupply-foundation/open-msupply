import React from 'react';
import {
  Box,
  InputWithLabelRow,
  Tooltip,
  useTranslation,
  InvoiceNodeStatus,
  DateTimePickerInput,
  DateUtils,
  Formatter,
  useConfirmationModal,
  usePreferences,
  useBufferState,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../api';
import { useInboundGraphQL } from '../api/useInboundGraphQL';

export const ReceivedDateInput = () => {
  const t = useTranslation();

  const {
    query: { data: shipment },
    isDisabled,
    update: { update },
  } = useInboundShipment();

  const { backdating } = usePreferences();
  const allowBackdatingOfShipments = backdating?.shipmentsEnabled;
  const maximumBackdatingDays = backdating?.maxDays;

  const isReceived =
    shipment?.status === InvoiceNodeStatus.Received ||
    shipment?.status === InvoiceNodeStatus.Verified;

  const currentReceivedDate = DateUtils.getDateOrNull(
    shipment?.receivedDatetime
  );

  // Don't set maxDate on the picker — it would clamp the displayed value
  // (which IS the current received date) on blur, triggering a false change.
  // The same-date check in handleChange and server validation handle this.
  const maxDate = currentReceivedDate ?? new Date();

  // +1 day buffer so the boundary date isn't rejected by server UTC check
  const minDate =
    maximumBackdatingDays && maximumBackdatingDays > 0
      ? DateUtils.addDays(new Date(), -maximumBackdatingDays + 1)
      : undefined;

  const atBackdatingLimit =
    !!minDate && !!currentReceivedDate && currentReceivedDate <= minDate;

  const disabledReason = !allowBackdatingOfShipments
    ? t('messages.received-date-backdating-not-enabled')
    : !isReceived
      ? t('messages.received-date-not-received')
      : atBackdatingLimit
        ? t('messages.received-date-exceeds-backdating-limit', {
            days: maximumBackdatingDays,
          })
        : undefined;

  const disabled = isDisabled || !!disabledReason;

  const { inboundApi, storeId } = useInboundGraphQL();

  const [dateValue, setDateValue] = useBufferState(currentReceivedDate);

  const getBackdateConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '', // set in handleChange
  });

  const getStocktakeWarningConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '', // set in handleChange
  });

  const checkStocktakeAfterDate = async (date: Date): Promise<boolean> => {
    try {
      const result = await inboundApi.stocktakeCountAfterDate({
        storeId,
        filter: {
          stocktakeDate: {
            afterOrEqualTo: Formatter.naiveDate(date),
          },
        },
      });
      const stocktakes = result?.stocktakes;
      if (stocktakes && 'totalCount' in stocktakes) {
        return stocktakes.totalCount > 0;
      }
    } catch {
      // If we can't check, don't block
    }
    return false;
  };

  const handleChange = async (newDate: Date | null) => {
    if (!newDate || !shipment?.id) return;

    const previousValue = dateValue;
    setDateValue(newDate);

    if (Formatter.naiveDate(newDate) === Formatter.naiveDate(dateValue)) return;

    const formattedDate = newDate.toLocaleDateString();

    const doUpdate = async () => {
      const hasStocktakeAfter = await checkStocktakeAfterDate(newDate);
      if (hasStocktakeAfter) {
        getStocktakeWarningConfirmation({
          message: t('messages.stocktake-after-backdate-warning', {
            date: formattedDate,
          }),
          onConfirm: async () => {
            await update({
              receivedDatetime: newDate.toISOString(),
            });
          },
          onCancel: () => setDateValue(previousValue),
        });
        return;
      }

      await update({
        receivedDatetime: newDate.toISOString(),
      });
    };

    getBackdateConfirmation({
      message: t('messages.confirm-backdate-received-date', {
        date: formattedDate,
      }),
      onConfirm: () => doUpdate(),
      onCancel: () => setDateValue(previousValue),
    });
  };

  return (
    <InputWithLabelRow
      label={t('label.received-date')}
      Input={
        <Tooltip title={disabledReason ?? ''} placement="bottom-start">
          <Box>
            <DateTimePickerInput
              disabled={disabled}
              value={dateValue}
              format="P"
              onChange={handleChange}
              maxDate={maxDate}
              minDate={minDate}
              actions={['cancel', 'accept']}
            />
          </Box>
        </Tooltip>
      }
    />
  );
};
