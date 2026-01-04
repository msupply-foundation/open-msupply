import React from 'react';
import { rankWith, ControlProps, isDateTimeControl } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  DateUtils,
  DateTimePickerInput,
  LocaleKey,
  useTranslation,
  extractProperty,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { DateOrTimeView, PickersActionBarAction } from '@mui/x-date-pickers';

const Options = z
  .object({
    // Use when you need a date-time result, but only selecting the date
    dateOnly: z.boolean().optional(),
    monthOnly: z.boolean().optional(),
    dateAsEndOfDay: z.boolean().optional(),
    disableFuture: z.boolean().optional(),
    // Max and min are paths to the data object
    max: z.string().optional(),
    min: z.string().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const datetimeTester = rankWith(5, isDateTimeControl);

const UIComponent = (props: ControlProps) => {
  const t = useTranslation();
  const { core } = useJsonForms();
  const [error, setError] = React.useState<string | undefined>(undefined);
  const { data, handleChange, label, path, uischema, config } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const { customErrors } = config;

  if (!props.visible) {
    return null;
  }

  const dateOnly = options?.dateOnly ?? false;
  const inputFormat = !dateOnly ? 'P p' : 'P';
  const max = options?.max
    ? extractProperty(core?.data, options.max.split('/').pop() ?? '')
    : undefined;
  const min = options?.min
    ? extractProperty(core?.data, options.min.split('/').pop() ?? '')
    : undefined;

  const onChange = (e: Date | null) => {
    if (!e) handleChange(path, undefined);
    customErrors.remove(path);

    try {
      setError(undefined);
      if (e) {
        const date = options?.monthOnly ? DateUtils.startOfMonth(e) : e;
        handleChange(path, date.toISOString());
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const sharedComponentProps = {
    value: DateUtils.getDateOrNull(data),
    onChange: (e: Date | null) => onChange(e),
    inputFormat,
    readOnly: !!props.uischema.options?.['readonly'],
    disabled: !props.enabled,
    error: zErrors || error || props.errors,
    dateAsEndOfDay: !!props.uischema.options?.['dateAsEndOfDay'],
    disableFuture: !!props.uischema.options?.['disableFuture'],
    ...(options?.monthOnly
      ? {
          views: ['year', 'month'] as DateOrTimeView[],
          format: 'MMM yyyy',
          actions: ['clear', 'accept'] as PickersActionBarAction[],
        }
      : {}),
    minDate: DateUtils.getDateOrNull(min) ?? undefined,
    maxDate: DateUtils.getDateOrNull(max) ?? undefined,
  };

  return (
    <DetailInputWithLabelRow
      sx={{
        ...DefaultFormRowSx,
        gap: 2,
      }}
      label={t(label as LocaleKey)}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        !dateOnly ? (
          <DateTimePickerInput showTime {...sharedComponentProps} />
        ) : (
          <DateTimePickerInput
            {...sharedComponentProps}
            onError={validationError => customErrors.add(path, validationError)}
          />
        )
      }
    />
  );
};

export const DateTime = withJsonFormsControlProps(UIComponent);
