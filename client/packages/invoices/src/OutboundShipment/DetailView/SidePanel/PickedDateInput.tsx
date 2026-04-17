import React, { useState } from 'react';
import {
  Box,
  Tooltip,
  PanelRow,
  PanelLabel,
  PanelField,
  useTranslation,
  InvoiceNodeStatus,
  DateTimePickerInput,
  DateUtils,
  Formatter,
  useConfirmationModal,
  usePreferences,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';

export const PickedDateInput = () => {
  const t = useTranslation();

  const { status, backdatedDatetime, createdDatetime, lines, update } =
    useOutbound.document.fields([
      'status',
      'backdatedDatetime',
      'createdDatetime',
      'lines',
    ]);

  const { backdating } = usePreferences();
  const allowBackdatingOfShipments = backdating?.enabled;
  const maximumBackdatingDays = backdating?.maxDays;

  const isNew = status === InvoiceNodeStatus.New;

  const currentDate =
    DateUtils.getDateOrNull(backdatedDatetime) ??
    DateUtils.getDateOrNull(createdDatetime);

  // +1 day buffer so the boundary date isn't rejected by server UTC check
  const minDate =
    maximumBackdatingDays && maximumBackdatingDays > 0
      ? DateUtils.addDays(new Date(), -maximumBackdatingDays + 1)
      : undefined;

  const lineCount = lines?.totalCount ?? 0;

  const disabledReason = !allowBackdatingOfShipments
    ? t('messages.received-date-backdating-not-enabled')
    : !isNew
      ? t('messages.picked-date-not-new')
      : undefined;

  const disabled = !!disabledReason;

  const { sdk, storeId } = useOutbound.utils.api();

  const [dateValue, setDateValue] = useState<Date | null>(currentDate);

  const getDeleteLinesConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-backdate-picked-date', { date: '' }),
  });

  const getStocktakeWarningConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.stocktake-after-backdate-warning', { date: '' }),
  });

  const checkStocktakeAfterDate = async (date: Date): Promise<boolean> => {
    try {
      const result = await sdk.outboundStocktakeCountAfterDate({
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
    if (!newDate || disabled) return;

    const previousValue = dateValue;
    setDateValue(newDate);

    if (dateValue && DateUtils.isSameDay(newDate, dateValue)) return;

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
              backdatedDatetime: newDate.toISOString(),
            });
          },
          onCancel: () => setDateValue(previousValue),
        });
        return;
      }

      await update({
        backdatedDatetime: newDate.toISOString(),
      });
    };

    // If lines exist, warn they'll be deleted (backend handles deletion atomically)
    if (lineCount > 0) {
      getDeleteLinesConfirmation({
        message: t('messages.confirm-backdate-picked-date', {
          date: formattedDate,
        }),
        onConfirm: () => doUpdate(),
        onCancel: () => setDateValue(previousValue),
      });
      return;
    }

    await doUpdate();
  };

  const dateInput = (
    <DateTimePickerInput
      disabled={disabled}
      value={dateValue}
      format="P"
      onChange={handleChange}
      maxDate={new Date()}
      minDate={minDate}
      actions={['cancel', 'accept']}
      width={140}
    />
  );

  return (
    <PanelRow>
      <PanelLabel>{t('label.picked-date')}</PanelLabel>
      <PanelField>
        {disabledReason ? (
          <Tooltip title={disabledReason} placement="left">
            <Box>{dateInput}</Box>
          </Tooltip>
        ) : (
          dateInput
        )}
      </PanelField>
    </PanelRow>
  );
};
