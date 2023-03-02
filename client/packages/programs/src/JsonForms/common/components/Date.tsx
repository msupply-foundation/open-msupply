import React, { FC } from 'react';
import { rankWith, ControlProps, isDateControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box, TextFieldProps } from '@mui/material';
import { BasicTextInput, useFormatDateTime } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';

const Options = z
  .object({
    disableFuture: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DatePickerTextInput = ({ variant, ...props }: TextFieldProps) => (
  <BasicTextInput
    error={!!props.error}
    helperText={props.error}
    FormHelperTextProps={
      !!props.error ? { sx: { color: 'error.main' } } : undefined
    }
    {...props}
    variant="standard"
  />
);

export const BaseDatePickerInput: FC<
  Omit<DatePickerProps<Date>, 'renderInput'> & { error: string }
> = props => (
  <DatePicker
    disabled={props.disabled}
    renderInput={DatePickerTextInput}
    {...props}
  />
);

export const dateTester = rankWith(5, isDateControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const dateFormatter = useFormatDateTime().customDate;
    const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const disableFuture = options?.disableFuture ?? false;

  if (!props.visible) {
    return null;
  }
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
        <BaseDatePickerInput
          // undefined is displayed as "now" and null as unset
          value={data ?? null}
          onChange={e => {
            if (e) handleChange(path, dateFormatter(e, 'yyyy-MM-dd'));
          }}
          inputFormat="dd/MM/yyyy"
          disabled={!props.enabled}
          error={props.errors ?? zErrors}
          disableFuture={disableFuture}
        />
      </Box>
    </Box>
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
