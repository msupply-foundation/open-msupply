import React from 'react';
import {
  Switch,
  Grid,
  Autocomplete,
  InputWithLabelRow,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { useRequest, useHideOverStocked } from '../../api';

const months = [1, 2, 3, 4, 5, 6];

export const ToolbarActions = () => {
  const { on, toggle } = useHideOverStocked();
  const t = useTranslation('replenishment');
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { minMonthsOfStock, maxMonthsOfStock, update } =
    useRequest.document.fields(['minMonthsOfStock', 'maxMonthsOfStock']);

  const getMinMOSConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.changing-min-mos'),
  });

  const getMinMOSUnassignConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.unassign-min-mos'),
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
              disabled={isDisabled || isProgram}
              clearIcon={null}
              isOptionEqualToValue={(a, b) => a.value === b.value}
              value={
                minMonthsOfStock === 0
                  ? { label: t('label.not-set'), value: 0 }
                  : {
                      label: t('label.number-months', {
                        count: minMonthsOfStock,
                      }),
                      value: minMonthsOfStock,
                    }
              }
              width="150px"
              options={[
                { label: t('label.not-set'), value: 0 },
                ...months.map(numberOfMonths => ({
                  label: t('label.number-months', { count: numberOfMonths }),
                  value: numberOfMonths,
                })),
              ]}
              onChange={(_, option) => {
                if (option && option.value === 0) {
                  getMinMOSUnassignConfirmation({
                    onConfirm: () => update({ minMonthsOfStock: option.value }),
                  });
                } else {
                  option &&
                    getMinMOSConfirmation({
                      onConfirm: () =>
                        update({ minMonthsOfStock: option.value }),
                    });
                }
              }}
              getOptionDisabled={option => option.value > maxMonthsOfStock}
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
              disabled={isDisabled || isProgram}
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
              getOptionDisabled={option => option.value < minMonthsOfStock}
            />
          }
        />
      </Grid>
      <Grid item>
        <InputWithLabelRow
          labelWidth="225px"
          label={t('label.hide-stock-over-minimum')}
          Input={
            <Switch
              onChange={toggle}
              checked={on}
              color="secondary"
              size="small"
            />
          }
        />
      </Grid>
    </Grid>
  );
};
