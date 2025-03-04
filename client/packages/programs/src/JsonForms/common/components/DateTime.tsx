import React from 'react';
import { rankWith, ControlProps, isDateTimeControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  DateUtils,
  DateTimePickerInput,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { useJSONFormsCustomError } from '../hooks/useJSONFormsCustomError';
import { PickersActionBarAction } from '@mui/x-date-pickers';

const Options = z
  .object({
    /**
     *
     */
    dateOnly: z.boolean().optional(),
    dateAsEndOfDay: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const datetimeTester = rankWith(5, isDateTimeControl);

const UIComponent = (props: ControlProps) => {
  const [error, setError] = React.useState<string | undefined>(undefined);
  const { data, handleChange, label, path, uischema } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const { customError, setCustomError } = useJSONFormsCustomError(
    path,
    'Date-Time'
  );

  if (!props.visible) {
    return null;
  }

  const dateOnly = options?.dateOnly ?? false;

  const inputFormat = !dateOnly ? 'P p' : 'P';

  const onChange = (e: Date | null) => {
    if (!e) return;
    setCustomError(undefined);

    try {
      setError(undefined);
      if (e) handleChange(path, e.toISOString());
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
    error: zErrors ?? error ?? customError ?? props.errors,
    actions: ['clear', 'today', 'accept'] as PickersActionBarAction[],
    dateAsEndOfDay: !!props.uischema.options?.['dateAsEndOfDay'],
  };

  return (
    <DetailInputWithLabelRow
      sx={{
        ...DefaultFormRowSx,
        gap: 2,
      }}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        !dateOnly ? (
          <DateTimePickerInput showTime {...sharedComponentProps} />
        ) : (
          <DateTimePickerInput
            {...sharedComponentProps}
            onError={validationError =>
              setCustomError(validationError ?? undefined)
            }
          />
        )
      }
    />
  );
};

export const DateTime = withJsonFormsControlProps(UIComponent);
