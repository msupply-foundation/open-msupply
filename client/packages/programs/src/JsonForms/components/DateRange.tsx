import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
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
  })
  .strict()
  .optional();

type Options = z.input<typeof Options>;

export const dateRangeTester = rankWith(10, uiTypeIs('DateRange'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const t = useTranslation();
  const { options } = useZodOptionsValidation(Options, uischema.options);

  const actions: PickersActionBarAction[] = options?.hideClear
    ? ['accept']
    : ['clear', 'accept'];

  const updateDate = (
    range: 'beforeOrEqualTo' | 'afterOrEqualTo',
    date: Date | null
  ) => {
    handleChange(path, {
      ...(data || {}),
      [range]: date ? date.toISOString() : null,
    });
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
          />
        }
      />
    </Box>
  );
};

export const DateRange = withJsonFormsControlProps(UIComponent);
