import React from 'react';
import {
  Autocomplete,
  InputWithLabelRow,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useRequestFields, useIsRequestDisabled } from '../../api';

const months = [1, 2, 3, 4, 5, 6];

export const ToolbarActions = () => {
  const t = useTranslation('replenishment');
  const isDisabled = useIsRequestDisabled();
  const { minMonthsOfStock, update } = useRequestFields('minMonthsOfStock');
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.changing-min-mos'),
  });

  return (
    <InputWithLabelRow
      labelWidth="150px"
      label={t('label.min-months-of-stock')}
      Input={
        <Autocomplete
          disabled={isDisabled}
          clearIcon={null}
          isOptionEqualToValue={(a, b) => a.value === b.value}
          value={{
            label: `${minMonthsOfStock} months`,
            value: minMonthsOfStock,
          }}
          width="150px"
          options={months.map(numberOfMonths => ({
            label: t('label.number-months', { numberOfMonths }),
            value: numberOfMonths,
          }))}
          onChange={(_, option) =>
            option &&
            getConfirmation({
              onConfirm: () => update({ minMonthsOfStock: option.value }),
            })
          }
        />
      }
    />
  );
};
