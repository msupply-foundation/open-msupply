import React, { FC } from 'react';
import { rankWith, ControlProps, isDateTimeControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  TextFieldProps,
  StandardTextFieldProps,
  BasicTextInput,
  DetailInputWithLabelRow,
  DateTimePicker,
  DateTimePickerProps,
  DateUtils,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { useJSONFormsCustomError } from '../hooks/useJSONFormsCustomError';

const Options = z
  .object({
    /**
     *
     */
    dateOnly: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

const TextField = (params: TextFieldProps) => {
  const textInputProps: StandardTextFieldProps = {
    ...params,
    variant: 'standard',
  };
  return <BasicTextInput {...textInputProps} />;
};

const DateTimePickerInput: FC<
  Omit<DateTimePickerProps<Date>, 'renderInput'> & {
    error: string;
    isDate?: boolean;
    onError?: (validationError: string) => void;
  }
> = ({ isDate, onError, ...props }) => (
  <DateTimePicker
    format={isDate ? 'P' : 'P p'}
    disabled={props.disabled}
    slots={{ textField: TextField }}
    slotProps={{
      textField: {
        error: !!props.error,
        helperText: props.error,
        FormHelperTextProps: !!props.error
          ? { sx: { color: 'error.main' } }
          : undefined,
      },
    }}
    onError={onError}
    views={
      isDate
        ? ['year', 'month', 'day']
        : ['year', 'month', 'day', 'hours', 'minutes', 'seconds']
    }
    {...props}
  />
);

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

  const inputFormat = !dateOnly ? 'dd/MM/yyyy hh:mm' : 'dd/MM/yyyy';

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
  };

  return (
    <DetailInputWithLabelRow
      sx={{
        gap: 2,
        minWidth: '300px',
        justifyContent: 'space-around',
      }}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        !dateOnly ? (
          <DateTimePickerInput
            // undefined is displayed as "now" and null as unset
            {...sharedComponentProps}
          />
        ) : (
          <DateTimePickerInput
            {...sharedComponentProps}
            isDate={true}
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
