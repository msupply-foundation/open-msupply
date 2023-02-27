import React, { useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  NumericTextInput,
  NumericTextInputProps,
  PositiveNumberInput,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../styleConstants';

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
    <DetailInputWithLabelRow
      sx={{
        margin: 0.5,
        marginLeft: 0,
        gap: 2,
        minWidth: '300px',
        justifyContent: 'space-around',
      }}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        schema.minimum !== undefined ? (
          <PositiveNumberInput {...inputProps} min={schema.minimum} />
        ) : (
          <NumericTextInput {...inputProps} />
        )
      }
    />
  );
};

export const NumberField = withJsonFormsControlProps(UIComponent);
