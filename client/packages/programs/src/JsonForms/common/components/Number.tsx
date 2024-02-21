import React, { useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  NumericTextInput,
  NumericTextInputProps,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';

export const numberTester = rankWith(3, schemaTypeIs('number'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors, schema } = props;
  const [localData, setLocalData] = useState<number | undefined>(data);
  const onChange = useDebounceCallback(
    (value: number | undefined) => handleChange(path, value),
    [path]
  );
  const error = !!errors;

  if (!props.visible) {
    return null;
  }
  const inputProps: NumericTextInputProps & {
    onChange: (newValue: number) => void;
  } = {
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
    value: localData,
  };
  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        <NumericTextInput
          {...inputProps}
          min={schema.minimum}
          max={schema.maximum}
        />
      }
    />
  );
};

export const NumberField = withJsonFormsControlProps(UIComponent);
