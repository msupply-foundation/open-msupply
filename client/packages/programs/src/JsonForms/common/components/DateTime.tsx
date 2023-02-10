import React, { FC } from 'react';
import { rankWith, ControlProps, isDateTimeControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  FormLabel,
  Box,
  TextFieldProps,
  StandardTextFieldProps,
} from '@mui/material';
import { BasicTextInput } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { DateTimePicker, DateTimePickerProps } from '@mui/x-date-pickers';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { BaseDatePickerInput as DatePickerInput } from './Date';

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

const DateTimePickerInput: FC<
  Omit<DateTimePickerProps<Date>, 'renderInput'> & { error: string }
> = props => {
  return (
    <DateTimePicker
      disabled={props.disabled}
      renderInput={(params: TextFieldProps) => {
        const textInputProps: StandardTextFieldProps = {
          ...params,
          variant: 'standard',
        };
        return (
          <BasicTextInput
            error={!!props.error}
            helperText={props.error}
            FormHelperTextProps={
              !!props.error ? { sx: { color: 'error.main' } } : undefined
            }
            {...textInputProps}
          />
        );
      }}
      {...props}
    />
  );
};

export const datetimeTester = rankWith(5, isDateTimeControl);

const UIComponent = (props: ControlProps) => {
  const [error, setError] = React.useState<string | undefined>(undefined);
  const { data, handleChange, label, path, uischema } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  if (!props.visible) {
    return null;
  }

  const dateOnly = options?.dateOnly ?? false;

  const inputFormat = !dateOnly ? 'dd/MM/yyyy hh:mm' : 'dd/MM/yyyy';

  const onChange = (e: Date | null) => {
    if (!e) return;

    try {
      setError(undefined);
      if (e) handleChange(path, e.toISOString());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const sharedComponentProps = {
    value: data ?? null,
    onChange: (e: Date | null) => onChange(e),
    inputFormat,
    readOnly: !!props.uischema.options?.['readonly'],
    disabled: !props.enabled,
    error: zErrors ?? error ?? props.errors,
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        {!dateOnly ? (
          <DateTimePickerInput
            // undefined is displayed as "now" and null as unset
            {...sharedComponentProps}
          />
        ) : (
          <DatePickerInput {...sharedComponentProps} />
        )}
      </Box>
    </Box>
  );
};

export const DateTime = withJsonFormsControlProps(UIComponent);
