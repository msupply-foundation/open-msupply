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
  LocaleKey,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { useOutboundDeleteLines } from '../../api/hooks/line/useOutboundDeleteLines';

export const PickedDateInput = () => {
  const t = useTranslation();

  const { status, backdatedDatetime, createdDatetime, lines, update } =
    useOutbound.document.fields([
      'status',
      'backdatedDatetime',
      'createdDatetime',
      'lines',
    ]);

  const { allowBackdatingOfShipments, maximumBackdatingDays } =
    usePreferences();

  const isNew = status === InvoiceNodeStatus.New;

  const currentDate = DateUtils.getDateOrNull(backdatedDatetime) ??
    DateUtils.getDateOrNull(createdDatetime);

  const backdatingLimit =
    maximumBackdatingDays && maximumBackdatingDays > 0
      ? DateUtils.addDays(new Date(), -maximumBackdatingDays)
      : undefined;

  const minDate = backdatingLimit;

  const lineCount = lines?.totalCount ?? 0;

  const disabledReason = !allowBackdatingOfShipments
    ? t('messages.received-date-backdating-not-enabled' as LocaleKey)
    : !isNew
      ? t('messages.picked-date-not-new' as LocaleKey)
      : undefined;

  const disabled = !!disabledReason;

  const { mutateAsync: deleteLinesMutation } = useOutboundDeleteLines();

  const { sdk, storeId } = useOutbound.utils.api();

  const [dateValue, setDateValue] = useState<Date | null>(currentDate);

  const getDeleteLinesConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-backdate-picked-date' as LocaleKey),
  });

  const getStocktakeWarningConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.stocktake-after-backdate-warning'),
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

    const oldDate = DateUtils.getDateOrNull(dateValue);
    if (newDate.toLocaleDateString() === oldDate?.toLocaleDateString()) return;

    const doUpdate = async () => {
      const hasStocktakeAfter = await checkStocktakeAfterDate(newDate);
      if (hasStocktakeAfter) {
        getStocktakeWarningConfirmation({
          onConfirm: async () => {
            await update({
              backdatedDatetime: Formatter.toIsoString(
                DateUtils.endOfDayOrNull(newDate)
              ),
            });
          },
          onCancel: () => setDateValue(previousValue),
        });
        return;
      }

      await update({
        backdatedDatetime: Formatter.toIsoString(
          DateUtils.endOfDayOrNull(newDate)
        ),
      });
    };

    // If lines exist, warn they'll be deleted (prescription pattern)
    if (lineCount > 0) {
      getDeleteLinesConfirmation({
        onConfirm: async () => {
          const lineIds = lines?.nodes?.map(l => ({ id: l.id })) ?? [];
          await deleteLinesMutation(lineIds);
          await doUpdate();
        },
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
