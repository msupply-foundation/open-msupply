import React from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Alert,
  Tooltip,
  Switch,
  Autocomplete,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { useHideOverStocked, useRequest } from '../../api';

const MONTHS = [1, 2, 3, 4, 5, 6];

export const Toolbar = () => {
  const { on, toggle } = useHideOverStocked();
  const t = useTranslation();
  const isDisabled = useRequest.utils.isDisabled();
  const isProgram = useRequest.utils.isProgram();
  const { itemFilter, setItemFilter } = useRequest.line.list();
  const {
    minMonthsOfStock,
    maxMonthsOfStock,
    theirReference,
    update,
    otherParty,
    programName,
  } = useRequest.document.fields([
    'theirReference',
    'otherParty',
    'programName',
    'minMonthsOfStock',
    'maxMonthsOfStock',
  ]);

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
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
      }}
    >
      <Grid container flexWrap="nowrap">
        <Grid display="flex" flex={1} flexDirection="column" gap={1}>
          {otherParty && (
            <InputWithLabelRow
              label={t('label.supplier-name')}
              Input={
                <InternalSupplierSearchInput
                  disabled={isDisabled || isProgram}
                  value={otherParty ?? null}
                  onChange={otherParty => update({ otherParty })}
                />
              }
            />
          )}
          <InputWithLabelRow
            label={t('label.supplier-ref')}
            Input={
              <Tooltip title={theirReference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={theirReference ?? null}
                  onChange={e => update({ theirReference: e.target.value })}
                />
              </Tooltip>
            }
          />
          {programName && (
            <Alert severity="info" sx={{ maxWidth: 1000 }}>
              {t('info.cannot-edit-program-requisition')}
            </Alert>
          )}
        </Grid>
        <Grid>
          <InputWithLabelRow
            label={t('label.min-months-of-stock')}
            labelWidth={'350px'}
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
                width="200px"
                options={[
                  { label: t('label.not-set'), value: 0 },
                  ...MONTHS.map(numberOfMonths => ({
                    label: t('label.number-months', { count: numberOfMonths }),
                    value: numberOfMonths,
                  })),
                ]}
                onChange={(_, option) => {
                  if (option && option.value === 0) {
                    getMinMOSUnassignConfirmation({
                      onConfirm: () =>
                        update({ minMonthsOfStock: option.value }),
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
          <InputWithLabelRow
            label={t('label.max-months-of-stock')}
            labelWidth={'350px'}
            Input={
              <Autocomplete
                disabled={isDisabled || isProgram}
                clearIcon={null}
                isOptionEqualToValue={(a, b) => a.value === b.value}
                value={{
                  label: t('label.number-months', { count: maxMonthsOfStock }),
                  value: maxMonthsOfStock,
                }}
                width="200px"
                options={MONTHS.map(numberOfMonths => ({
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
      </Grid>
      <Grid
        display="flex"
        gap={1}
        alignItems="flex-end"
        justifyContent="flex-end"
      >
        <Grid>
          <Switch
            label={t('label.hide-stock-over-minimum')}
            onChange={toggle}
            checked={on}
            color="secondary"
            size="small"
            labelSx={{ margin: '5px 0' }}
          />
        </Grid>
        <Grid>
          <SearchBar
            placeholder={t('placeholder.filter-items')}
            value={itemFilter}
            onChange={newValue => {
              setItemFilter(newValue);
            }}
            debounceTime={0}
          />
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
