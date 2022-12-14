import React, { useState } from 'react';
import {
  or,
  ControlProps,
  rankWith,
  schemaTypeIs,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  NumericTextInput,
  NumericTextInputProps,
  PositiveNumberInput,
  useDebounceCallback,
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_COLUMN_WIDTH,
} from '../styleConstants';
import { Box } from '@mui/system';
import { FormLabel } from '@mui/material';

export const numberTester = rankWith(
  5,
  or(schemaTypeIs('number'), uiTypeIs('Number'))
);

type NumberOptions = {
  /*
  Options only required if the saved data should be converted to a string
  representation of the number
  */
  output?: 'string';
  /*
  The output string will be padded with leading 0's up to the number of significant figures specified
  */
  sigFigs?: number;
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors, schema, uischema } = props;

  const options: NumberOptions = uischema?.options ?? {};

  const [localData, setLocalData] = useState<number | undefined>(Number(data));
  const onChange = useDebounceCallback(
    (value: number | string) => handleChange(path, value),
    [path]
  );
  const error = !!errors;

  // The selected number can be saved as a string (with optional leading zeroes)
  // using the "output: string" and "sigFig" options
  const formatValue = (value: number): number | string => {
    if (options?.['output'] !== 'string') return value;
    return String(value).padStart(options?.['sigFigs'] ?? 0, '0');
  };

  if (!props.visible) {
    return null;
  }
  const inputProps: NumericTextInputProps & {
    onChange: (newValue: number) => void;
  } = {
    type: 'number',
    InputProps: {
      sx: { '& .MuiInput-input': { textAlign: 'right' } },
    },
    onChange: value => {
      setLocalData(value);
      onChange(formatValue(value));
    },
    disabled: !props.enabled,
    error: error,
    helperText: errors,
    value: localData ?? '',
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
        {schema.minimum !== undefined ? (
          <PositiveNumberInput {...inputProps} min={schema.minimum} />
        ) : (
          <NumericTextInput {...inputProps} />
        )}
      </Box>
    </Box>
  );
};

export const NumberField = withJsonFormsControlProps(UIComponent);
