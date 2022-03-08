import React from 'react';
import {
  Switch,
  Grid,
  Autocomplete,
  InputWithLabelRow,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import {
  useRequestFields,
  useIsRequestDisabled,
  useHideOverStocked,
} from '../../api';

const months = [1, 2, 3, 4, 5, 6];

export const ToolbarActions = () => {
  const { on, toggle } = useHideOverStocked();
  const t = useTranslation('replenishment');
  const isDisabled = useIsRequestDisabled();
  const { minMonthsOfStock, maxMonthsOfStock, update } = useRequestFields([
    'minMonthsOfStock',
    'maxMonthsOfStock',
  ]);

  const getMinMOSConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.changing-min-mos'),
  });

  const getMaxMOSConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.changing-max-mos'),
  });

  return (
    <Grid container gap={1} direction="column">
      <Grid item>
        <InputWithLabelRow
          labelWidth="150px"
          label={t('label.min-months-of-stock')}
          Input={
            <Autocomplete
              disabled={isDisabled}
              clearIcon={null}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              value={{
                label: t('label.number-months', { count: minMonthsOfStock }),
                value: minMonthsOfStock,
              }}
              width="150px"
              options={months.map(numberOfMonths => ({
                label: t('label.number-months', { count: numberOfMonths }),
                value: numberOfMonths,
              }))}
              onChange={(_, option) =>
                option &&
                getMinMOSConfirmation({
                  onConfirm: () => update({ minMonthsOfStock: option.value }),
                })
              }
            />
          }
        />
      </Grid>
      <Grid item>
        <InputWithLabelRow
          labelWidth="150px"
          label={t('label.max-months-of-stock')}
          Input={
            <Autocomplete
              disabled={isDisabled}
              clearIcon={null}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              value={{
                label: t('label.number-months', { count: maxMonthsOfStock }),
                value: maxMonthsOfStock,
              }}
              width="150px"
              options={months.map(numberOfMonths => ({
                label: t('label.number-months', { count: numberOfMonths }),
                value: numberOfMonths,
              }))}
              onChange={(_, option) =>
                option &&
                getMaxMOSConfirmation({
                  onConfirm: () => update({ maxMonthsOfStock: option.value }),
                })
              }
            />
          }
        />
      </Grid>
      <Grid item>
        <InputWithLabelRow
          labelWidth="225px"
          label={t('label.hide-stock-over-threshold')}
          Input={
            <Switch onChange={toggle} checked={on} color="gray" size="small" />
          }
        />
      </Grid>
    </Grid>
  );
};
