import React, { useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
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

export const numberTester = rankWith(3, schemaTypeIs('number'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors, schema } = props;
  const [localData, setLocalData] = useState<number | undefined>(data);
  const onChange = useDebounceCallback(
    (value: number) => handleChange(path, value),
    [path]
  );
  const error = !!errors;

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
      onChange(value);
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
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      sx={{ margin: 0.5, marginLeft: 0, gap: 2 }}
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
