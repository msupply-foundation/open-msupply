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
  const allowBackdatingOfShipments = backdating?.shipmentsEnabled;
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
  const { mutateAsync: deleteLines } = useOutbound.line.delete();

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
    // Outgoing stock: snap backdated days to 23:59 so the entry sorts after any
    // other same-day transactions. For today, send the actual moment — endOfDay
    // would be in the future for positive-UTC timezones and fail validation.
    const backdatedDatetime = DateUtils.isToday(newDate)
      ? newDate.toISOString()
      : Formatter.toIsoString(DateUtils.endOfDayOrNull(newDate));

    // The backend rejects backdating while lines exist (they were allocated at the
    // old date), so any lines are deleted here first - once every confirmation has
    // been accepted. Mirrors the prescription toolbar's date change.
    const applyBackdate = async () => {
      if (lineCount > 0) {
        await deleteLines(lines?.nodes ?? []);
      }
      await update({ backdatedDatetime });
    };

    const doUpdate = async () => {
      const hasStocktakeAfter = await checkStocktakeAfterDate(newDate);
      if (hasStocktakeAfter) {
        getStocktakeWarningConfirmation({
          message: t('messages.stocktake-after-backdate-warning', {
            date: formattedDate,
          }),
          onConfirm: applyBackdate,
          onCancel: () => setDateValue(previousValue),
        });
        return;
      }

      await applyBackdate();
    };

    // If lines exist, warn they'll be deleted
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
      textFieldTestId="picked-date-field"
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
