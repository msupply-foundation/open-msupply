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

  const { allowBackdatingOfShipments, maximumBackdatingDays } =
    usePreferences();

  const isReceived =
    shipment?.status === InvoiceNodeStatus.Received ||
    shipment?.status === InvoiceNodeStatus.Verified;

  const currentReceivedDate = DateUtils.getDateOrNull(
    shipment?.receivedDatetime
  );

  const minDate =
    maximumBackdatingDays && maximumBackdatingDays > 0
      ? DateUtils.addDays(new Date(), -maximumBackdatingDays)
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

    if (Formatter.naiveDate(newDate) === Formatter.naiveDate(dateValue)) return;

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
