import React, { useState } from 'react';
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
  LocaleKey,
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

  const { allowBackdatingOfShipments, maximumBackdatingDays } =
    usePreferences();

  const isReceived =
    shipment?.status === InvoiceNodeStatus.Received ||
    shipment?.status === InvoiceNodeStatus.Verified;

  const currentReceivedDate = DateUtils.getDateOrNull(
    shipment?.receivedDatetime
  );

  const deliveredDate = DateUtils.getDateOrNull(shipment?.deliveredDatetime);

  const backdatingLimit =
    maximumBackdatingDays && maximumBackdatingDays > 0
      ? DateUtils.addDays(new Date(), -maximumBackdatingDays)
      : undefined;

  // minDate is the later of the backdating limit and the delivered date
  const minDate =
    backdatingLimit && deliveredDate
      ? DateUtils.maxDate(backdatingLimit, deliveredDate)
      : backdatingLimit ?? deliveredDate ?? undefined;

  // Check why there's no room to move the date further back
  const atDeliveredDate =
    !!deliveredDate &&
    !!currentReceivedDate &&
    currentReceivedDate.toLocaleDateString() ===
      deliveredDate.toLocaleDateString();

  const atBackdatingLimit =
    !!backdatingLimit &&
    !!currentReceivedDate &&
    currentReceivedDate <= backdatingLimit;

  const disabledReason = !allowBackdatingOfShipments
    ? t('messages.received-date-backdating-not-enabled' as LocaleKey)
    : !isReceived
      ? t('messages.received-date-not-received' as LocaleKey)
      : atDeliveredDate
        ? t('messages.received-date-at-delivered-date' as LocaleKey)
        : atBackdatingLimit
          ? t(
              'messages.received-date-exceeds-backdating-limit' as LocaleKey,
              { days: maximumBackdatingDays }
            )
          : undefined;

  const disabled = isDisabled || !!disabledReason;

  const { inboundApi, storeId } = useInboundGraphQL();

  const [dateValue, setDateValue] = useState<Date | null>(currentReceivedDate);

  const getBackdateConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-backdate-received-date'),
  });

  const getStocktakeWarningConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.stocktake-after-backdate-warning'),
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

    const oldDate = DateUtils.getDateOrNull(dateValue);
    if (newDate.toLocaleDateString() === oldDate?.toLocaleDateString()) return;

    const doUpdate = async () => {
      const hasStocktakeAfter = await checkStocktakeAfterDate(newDate);
      if (hasStocktakeAfter) {
        getStocktakeWarningConfirmation({
          onConfirm: async () => {
            await update({
              receivedDatetime: Formatter.naiveDate(newDate) ?? undefined,
            });
          },
          onCancel: () => setDateValue(previousValue),
        });
        return;
      }

      await update({
        receivedDatetime: Formatter.naiveDate(newDate) ?? undefined,
      });
    };

    getBackdateConfirmation({
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
              maxDate={currentReceivedDate ?? new Date()}
              minDate={minDate}
              actions={['cancel', 'accept']}
            />
          </Box>
        </Tooltip>
      }
    />
  );
};
