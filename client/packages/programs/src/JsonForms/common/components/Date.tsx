import React, { useCallback } from 'react';
import { rankWith, ControlProps, isDateControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useFormatDateTime,
  DateUtils,
  LocaleKey,
  useTranslation,
  DateTimePickerInput,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';

const Options = z
  .object({
    disableFuture: z.boolean().optional(),
    // Use to provide year/month selector only, day will be fixed to first of
    // month
    noDay: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const dateTester = rankWith(5, isDateControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema, config } = props;

  const t = useTranslation();
  const formatDateTime = useFormatDateTime();
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const { customErrors } = config;

  const disableFuture = options?.disableFuture ?? false;
  const noDay = options?.noDay ?? false;

  const formatDate = useCallback(
    (date: Date) => {
      const d = noDay ? DateUtils.startOfMonth(date) : date;
      return formatDateTime.customDate(d, 'yyyy-MM-dd');
    },
    [formatDateTime, noDay]
  );

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      inputSx={{ width: '1px' }} // hack so widths honour flexBasis
      label={t(label as LocaleKey)}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        <DateTimePickerInput
          width="100%"
          // undefined is displayed as "now" and null as unset
          value={DateUtils.getNaiveDate(data)}
          onChange={e => {
            handleChange(path, !e ? undefined : formatDate(e));
            customErrors.remove(path);
          }}
          views={noDay ? ['year', 'month'] : ['year', 'month', 'day']}
          openTo={noDay ? 'month' : 'day'}
          format="P"
          disabled={!props.enabled}
          error={zErrors || props.errors || ''}
          disableFuture={disableFuture}
          onError={validationError => customErrors.add(path, validationError)}
        />
      }
    />
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
