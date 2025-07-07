import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DateUtils,
  useTranslation,
  Box,
  DetailInputWithLabelRow,
  Typography,
  LocaleKey,
  DateTimePickerInput,
} from '@openmsupply-client/common';
import { z } from 'zod';

import {
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { PickersActionBarAction } from '@mui/x-date-pickers';

const Options = z
  .object({
    hideClear: z.boolean().optional(),
    disableFuture: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.input<typeof Options>;

export const dateRangeTester = rankWith(10, uiTypeIs('DateRange'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema, errors } = props;
  const t = useTranslation();
  const { options } = useZodOptionsValidation(Options, uischema.options);

  const { core, i18n } = useJsonForms();
  const err = core?.errors?.find(e => e.instancePath === `/${path}`);
  const errorMessage =
    err && i18n && i18n.translate && i18n.translateError
      ? i18n.translateError(err, i18n.translate)
      : err?.message;

  const actions: PickersActionBarAction[] = options?.hideClear
    ? ['accept']
    : ['clear', 'accept'];

  const updateDate = (
    range: 'beforeOrEqualTo' | 'afterOrEqualTo',
    date: Date | null
  ) => {
    const otherRange =
      range === 'afterOrEqualTo' ? 'beforeOrEqualTo' : 'afterOrEqualTo';

    const existingOtherDate = data?.[otherRange];

    handleChange(path, {
      ...(existingOtherDate ? { [otherRange]: existingOtherDate } : {}),
      ...(date ? { [range]: date.toISOString() } : {}),
    });
  };

  const getError = (field: 'afterOrEqualTo' | 'beforeOrEqualTo') => {
    if (err?.params['missingProperty'] === field && errorMessage) {
      return errorMessage;
    } else {
      return errors;
    }
  };

  if (!props.visible) {
    return null;
  }

  return (
    <Box>
      {label && (
        <Typography
          variant="subtitle1"
          width={'100%'}
          textAlign="left"
          marginBottom={1}
          paddingBottom={1}
          paddingTop={3}
        >
          <strong>{t(label as LocaleKey)}</strong>
        </Typography>
      )}
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={t('label.from-date')}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
        Input={
          <DateTimePickerInput
            value={DateUtils.getDateOrNull(data?.afterOrEqualTo)}
            onChange={date => updateDate('afterOrEqualTo', date)}
            disabled={!props.enabled}
            actions={actions}
            maxDate={
              DateUtils.getDateOrNull(data?.beforeOrEqualTo) ?? undefined
            }
            disableFuture={options?.disableFuture}
            error={getError('afterOrEqualTo')}
          />
        }
      />
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={t('label.to-date')}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
        Input={
          <DateTimePickerInput
            value={DateUtils.getDateOrNull(data?.beforeOrEqualTo)}
            onChange={date => updateDate('beforeOrEqualTo', date)}
            disabled={!props.enabled}
            actions={actions}
            dateAsEndOfDay
            minDate={DateUtils.getDateOrNull(data?.afterOrEqualTo) ?? undefined}
            disableFuture={options?.disableFuture}
            error={getError('beforeOrEqualTo')}
          />
        }
      />
    </Box>
  );
};

export const DateRange = withJsonFormsControlProps(UIComponent);
