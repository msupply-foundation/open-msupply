import React, { FC } from 'react';
import { rankWith, ControlProps, isDateControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  FormLabel,
  Box,
  TextFieldProps,
  StandardTextFieldProps,
} from '@mui/material';
import { BasicTextInput, useFormatDateTime } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers';

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
  const { data, handleChange, label, path } = props;
  const dateFormatter = useFormatDateTime().customDate;
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
          error={props.errors}
        />
      </Box>
    </Box>
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
